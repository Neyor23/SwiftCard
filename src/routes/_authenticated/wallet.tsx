import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeftRight, ArrowUpRight, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery, txnsQuery, ratesQuery } from "@/lib/data";
import { addBankAccount, listBanks, paymentsStatus, requestWithdrawal } from "@/lib/payments.functions";
import { errMsg, money, type Currency } from "@/lib/format";
import { BalanceCard } from "@/components/BalanceCard";
import { TxnList } from "@/components/TxnList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({ meta: [{ title: "Wallet — SwiftCard" }, { name: "description", content: "Withdraw your earnings and view transactions." }] }),
  component: WalletPage,
});

function WalletPage() {
  const status = useServerFn(paymentsStatus);
  const { data: ps } = useQuery({ queryKey: ["pay-status"], queryFn: () => status() });
  const { data: txns = [] } = useQuery(txnsQuery(100));
  const [filter, setFilter] = useState("all");

  const shown = filter === "all" ? txns : txns.filter((t) => t.type === filter);
  const live = ps?.configured;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Wallet</h1>
      {ps && !live && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p>Withdrawals are being set up and will be available soon. You can still sell cards and convert between ₦ and $.</p>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <BalanceCard />
        <div className="rounded-2xl border bg-card p-5">
          <Tabs defaultValue="withdraw">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="withdraw"><ArrowUpRight className="mr-1 h-3.5 w-3.5" />Withdraw</TabsTrigger>
              <TabsTrigger value="convert"><ArrowLeftRight className="mr-1 h-3.5 w-3.5" />Convert</TabsTrigger>
            </TabsList>
            <TabsContent value="withdraw"><Withdraw disabled={!live} /></TabsContent>
            <TabsContent value="convert"><Convert /></TabsContent>
          </Tabs>
        </div>
      </div>
      <div className="rounded-2xl border bg-card p-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Transaction history</h2>
          <div className="flex flex-wrap gap-1">
            {["all", "sell", "withdrawal"].map((f) => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "ghost"} className="capitalize" onClick={() => setFilter(f)}>{f}</Button>
            ))}
          </div>
        </div>
        <TxnList items={shown} />
      </div>
    </div>
  );
}

function Withdraw({ disabled }: { disabled: boolean }) {
  const qc = useQueryClient();
  const { data: me } = useQuery(profileQuery);
  const getBanks = useServerFn(listBanks);
  const addBank = useServerFn(addBankAccount);
  const withdraw = useServerFn(requestWithdrawal);
  const { data: accounts = [] } = useQuery({
    queryKey: ["banks"], enabled: !!me,
    queryFn: async () => (await supabase.from("bank_accounts").select("*").eq("user_id", me!.user.id)).data ?? [],
  });
  const { data: banks = [] } = useQuery({ queryKey: ["bank-list"], enabled: !disabled, queryFn: () => getBanks(), staleTime: 3600_000 });
  const [bankId, setBankId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [adding, setAdding] = useState(false);
  const [code, setCode] = useState("");
  const [acct, setAcct] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    const b = banks.find((x) => x.code === code);
    if (!b || !/^\d{10}$/.test(acct)) return toast.error("Choose a bank and enter a 10-digit account number");
    setBusy(true);
    try {
      const r = await addBank({ data: { bankCode: b.code, bankName: b.name, accountNumber: acct } });
      toast.success(`Added ${r.accountName}`);
      setAdding(false); setAcct("");
      qc.invalidateQueries({ queryKey: ["banks"] });
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  }
  async function send() {
    if (!bankId) return toast.error("Choose a bank account");
    setBusy(true);
    try {
      await withdraw({ data: { amount: Number(amount), bankId } });
      toast.success("Withdrawal started");
      setAmount("");
      qc.invalidateQueries();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  }
  async function remove(id: string) {
    await supabase.from("bank_accounts").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["banks"] });
  }

  return (
    <div className="space-y-4 pt-4">
      {accounts.map((a) => (
        <label key={a.id} className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm has-[:checked]:border-primary">
          <input type="radio" name="bank" checked={bankId === a.id} onChange={() => setBankId(a.id)} className="accent-[var(--primary)]" />
          <div className="flex-1"><p className="font-medium">{a.account_name}</p><p className="text-xs text-muted-foreground">{a.bank_name} · {a.account_number}</p></div>
          <button type="button" onClick={() => remove(a.id)} aria-label="Remove"><Trash2 className="h-4 w-4 text-muted-foreground" /></button>
        </label>
      ))}
      {adding ? (
        <div className="space-y-3 rounded-xl border p-3">
          <Select value={code} onValueChange={setCode}>
            <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
            <SelectContent className="max-h-72">{banks.map((b) => <SelectItem key={b.code + b.name} value={b.code}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="Account number" inputMode="numeric" maxLength={10} value={acct} onChange={(e) => setAcct(e.target.value.replace(/\D/g, ""))} />
          <div className="flex gap-2"><Button disabled={busy} onClick={save} size="sm">Verify & save</Button><Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button></div>
        </div>
      ) : (
        <Button variant="outline" disabled={disabled} className="w-full" onClick={() => setAdding(true)}>+ Add bank account</Button>
      )}
      <div className="space-y-1.5"><Label>Amount (₦)</Label><Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} /></div>
      <Button disabled={disabled || busy || !amount} onClick={send} className="w-full bg-gold">Withdraw</Button>
    </div>
  );
}

function Convert() {
  const qc = useQueryClient();
  const { data } = useQuery(ratesQuery);
  const [from, setFrom] = useState<Currency>("NGN");
  const [amount, setAmount] = useState("");
  const rate = data?.usdNgn ?? 1550;
  const out = from === "NGN" ? Number(amount || 0) / rate : Number(amount || 0) * rate;
  async function go() {
    const { error } = await supabase.rpc("convert_currency", { _from: from, _amount: Number(amount) });
    if (error) return toast.error(errMsg(error));
    toast.success("Converted");
    setAmount("");
    qc.invalidateQueries();
  }
  return (
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-2 gap-2">
        <Button variant={from === "NGN" ? "default" : "outline"} onClick={() => setFrom("NGN")}>₦ → $</Button>
        <Button variant={from === "USD" ? "default" : "outline"} onClick={() => setFrom("USD")}>$ → ₦</Button>
      </div>
      <div className="space-y-1.5"><Label>Amount ({from === "NGN" ? "₦" : "$"})</Label><Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} /></div>
      <p className="text-sm text-muted-foreground">You get <span className="font-semibold text-foreground">{money(out, from === "NGN" ? "USD" : "NGN")}</span> · $1 = ₦{rate.toLocaleString()}</p>
      <Button disabled={!Number(amount)} onClick={go} className="w-full bg-gold">Convert</Button>
    </div>
  );
}
