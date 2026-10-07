import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { paystack } from "./paystack.server";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const paymentsStatus = createServerFn({ method: "GET" }).handler(async () => ({
  configured: !!process.env["PAYSTACK_SECRET_KEY"],
}));

// Wallet funding (deposits) was removed: the app is sell-only. Legacy pending deposits
// are still settled by the webhook and admin resync via apply_deposit.

export const listBanks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const banks = await paystack<{ name: string; code: string }[]>("/bank?country=nigeria&perPage=200");
    return banks.map((b) => ({ name: b.name, code: b.code }));
  });

export const addBankAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ bankCode: z.string().min(2).max(10), bankName: z.string().max(100), accountNumber: z.string().regex(/^\d{10}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const resolved = await paystack<{ account_name: string }>(
      `/bank/resolve?account_number=${data.accountNumber}&bank_code=${encodeURIComponent(data.bankCode)}`,
    );
    const recipient = await paystack<{ recipient_code: string }>("/transferrecipient", {
      method: "POST",
      body: { type: "nuban", name: resolved.account_name, account_number: data.accountNumber, bank_code: data.bankCode, currency: "NGN" },
    });
    const db = await admin();
    const { error } = await db.from("bank_accounts").insert({
      user_id: context.userId,
      bank_name: data.bankName,
      bank_code: data.bankCode,
      account_number: data.accountNumber,
      account_name: resolved.account_name,
      recipient_code: recipient.recipient_code,
    });
    if (error) throw new Error("Could not save bank account");
    return { accountName: resolved.account_name };
  });

export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ amount: z.number().min(100).max(5_000_000), bankId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: bank } = await db.from("bank_accounts").select("*").eq("id", data.bankId).eq("user_id", context.userId).maybeSingle();
    if (!bank?.recipient_code) throw new Error("Bank account not found");
    const { data: ref, error } = await db.rpc("start_withdrawal", { _user: context.userId, _amount: data.amount, _bank_id: data.bankId });
    if (error || !ref) throw new Error(error?.message ?? "Could not start withdrawal");
    try {
      await paystack("/transfer", {
        method: "POST",
        body: { source: "balance", amount: Math.round(data.amount * 100), recipient: bank.recipient_code, reference: ref, reason: "Wallet withdrawal" },
      });
    } catch (e) {
      await db.rpc("settle_withdrawal", { _reference: ref, _success: false, _provider_status: "initiation_failed" });
      throw e;
    }
    return { reference: ref };
  });

// ---------- Admin reconciliation ----------
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const reconcileLedger = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ days: z.number().min(1).max(90) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const since = new Date(Date.now() - data.days * 86400000).toISOString();
    const { data: rows } = await db
      .from("transactions")
      .select("id,user_id,type,status,amount,reference,created_at")
      .in("type", ["deposit", "withdrawal"])
      .neq("description", "Currency conversion")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(300);
    const ledger = rows ?? [];
    let provider: Record<string, { status: string; amount: number }> = {};
    let providerError: string | null = null;
    try {
      const from = since.slice(0, 10);
      const [txs, trs] = await Promise.all([
        paystack<{ reference: string; status: string; amount: number }[]>(`/transaction?perPage=500&from=${from}`),
        paystack<{ reference: string; status: string; amount: number }[]>(`/transfer?perPage=500&from=${from}`),
      ]);
      for (const t of [...txs, ...trs]) provider[t.reference] = { status: t.status, amount: t.amount / 100 };
    } catch (e) {
      providerError = e instanceof Error ? e.message : "Provider unavailable";
      provider = {};
    }
    const mapStatus = (s?: string) => (s === "success" ? "successful" : s === "failed" || s === "reversed" || s === "abandoned" ? "failed" : s ? "pending" : undefined);
    const report = ledger.map((r) => {
      const p = provider[r.reference ?? ""];
      const ps = mapStatus(p?.status);
      let issue: string | null = null;
      if (!providerError) {
        if (!p) issue = "Missing at Paystack";
        else if (ps !== r.status) issue = "Status differs";
        else if (Math.abs(p.amount - Number(r.amount)) > 0.01) issue = "Amount differs";
      }
      return { ...r, providerStatus: p?.status ?? null, providerAmount: p?.amount ?? null, issue };
    });
    return { report, providerError };
  });

export const resyncTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ reference: z.string().min(5).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    if (data.reference.startsWith("DEP-")) {
      const v = await paystack<{ status: string; amount: number }>(`/transaction/verify/${encodeURIComponent(data.reference)}`);
      const { data: r } = await db.rpc("apply_deposit", { _reference: data.reference, _amount_kobo: v.amount, _provider_status: v.status });
      return { result: r };
    }
    const v = await paystack<{ status: string }>(`/transfer/verify/${encodeURIComponent(data.reference)}`);
    if (v.status === "success" || v.status === "failed" || v.status === "reversed") {
      const { data: r } = await db.rpc("settle_withdrawal", { _reference: data.reference, _success: v.status === "success", _provider_status: v.status });
      return { result: r };
    }
    return { result: "still_pending" };
  });
