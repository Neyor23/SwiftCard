import { createFileRoute } from "@tanstack/react-router";
import { verifySignature } from "@/lib/paystack.server";

export const Route = createFileRoute("/api/public/paystack-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        let ok = false;
        try {
          ok = await verifySignature(raw, request.headers.get("x-paystack-signature"));
        } catch {
          return new Response("Not configured", { status: 503 });
        }
        if (!ok) return new Response("Invalid signature", { status: 401 });

        let evt: { event?: string; data?: { reference?: string; amount?: number; status?: string } };
        try {
          evt = JSON.parse(raw);
        } catch {
          return new Response("Bad payload", { status: 400 });
        }
        const event = String(evt.event ?? "");
        const ref = String(evt.data?.reference ?? "");
        if (!event || !ref || ref.length > 120) return new Response("ok");

        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        // Idempotency: record each (event, reference) once
        const { error: dup } = await db.from("paystack_events").insert({ event, reference: ref, payload: evt as never });
        if (dup && dup.code === "23505") return new Response("duplicate");
        if (dup) return new Response("Storage error", { status: 500 });

        let rpcError: unknown = null;
        if (event === "charge.success" && ref.startsWith("DEP-")) {
          // Legacy: only settles deposits created before the app went sell-only.
          ({ error: rpcError } = await db.rpc("apply_deposit", { _reference: ref, _amount_kobo: Number(evt.data?.amount ?? 0), _provider_status: "success" }));
        } else if (event === "transfer.success") {
          ({ error: rpcError } = await db.rpc("settle_withdrawal", { _reference: ref, _success: true, _provider_status: "success" }));
        } else if (event === "transfer.failed" || event === "transfer.reversed") {
          ({ error: rpcError } = await db.rpc("settle_withdrawal", { _reference: ref, _success: false, _provider_status: event.split(".")[1] ?? "failed" }));
        }
        if (rpcError) {
          // Un-record the event so Paystack's retry is processed instead of treated as a duplicate.
          console.error("Paystack webhook processing failed", event, ref);
          await db.from("paystack_events").delete().eq("event", event).eq("reference", ref);
          return new Response("Processing error", { status: 500 });
        }
        return new Response("ok");
      },
    },
  },
});
