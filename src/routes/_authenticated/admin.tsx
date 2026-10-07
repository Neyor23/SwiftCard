import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/data";
import { reconcileLedger, resyncTransaction } from "@/lib/payments.functions";
import { errMsg, money, shortDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/TxnList";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — SwiftCard" }, { name: "description", content: "Review cards and reconcile payments." }] }),
  component: Admin,
});

function Admin() {
  const { data: me, isLoading } = useQuery(profileQuery);
  if (isLoading) return null;
  if (!me?.isAdmin) return <p className="text-muted-foreground">You don't have access to this page.</p>;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <Tabs defaultValue="review">
        <TabsList>
          <TabsTrigger value="review">Card reviews</TabsTrigger>
          <TabsTrigger value="reconcile">Reconciliation</TabsTrigger>
          <TabsTrigger value="kyc">Verification</TabsTrigger>
        </TabsList>
        <TabsContent value="review"><Reviews /></TabsContent>
        <TabsContent value="reconcile"><Reconcile /></TabsContent>
        <TabsContent value="kyc"><KycReviews /></TabsContent>
      </Tabs>
    </div>
  );
}

function Reviews() {
  const qc = useQueryClient();
  const { data: sales = [] } = useQuery({
    queryKey: ["admin-sales"],
    queryFn: async () => (await supabase.from("gift_card_sales").select("*").eq("status", "pending").order("created_at")).data ?? [],
  });
  const [notes, setNotes] = useState<Record<string, string>>({});
  async function review(id: string, approve: boolean) {
    const { error } = await supabase.rpc("review_sale", { _sale_id: id, _approve: approve, _note: notes[id] || null } as never);
    if (error) return toast.error(errMsg(error));
    toast.success(approve ? "Approved and paid" : "Rejected");
    qc.invalidateQueries();
  }
  async function openImage(path: string) {
    const { data } = await supabase.storage.from("card-images").createSignedUrl(path, 300);
    if (data) window.open(data.signedUrl, "_blank", "noopener");
  }
  if (!sales.length) return <p className="py-8 text-sm text-muted-foreground">No cards waiting for review.</p>;
  return (
    <div className="grid gap-4 pt-4 md:grid-cols-2">
      {sales.map((s) => (
        <div key={s.id} className="space-y-3 rounded-2xl border bg-card p-5">
          <div className="flex justify-between">
            <div><p className="font-semibold">{s.brand} · {s.card_type}</p><p className="text-xs text-muted-foreground">{shortDate(s.created_at)} · user {s.user_id.slice(0, 8)}</p></div>
            <p className="font-semibold text-primary">{money(s.expected_payout, s.payout_currency)}</p>
          </div>
          <p className="text-sm">${s.card_value} × {s.quantity}</p>
          {s.card_codes && <pre className="whitespace-pre-wrap rounded-lg bg-muted p-2 font-mono text-xs">{s.card_codes}</pre>}
          {s.image_paths.length > 0 && <div className="flex flex-wrap gap-2">{s.image_paths.map((p, i) => <Button key={p} size="sm" variant="outline" onClick={() => openImage(p)}>Image {i + 1}</Button>)}</div>}
          <Textarea placeholder="Note to user (optional)" value={notes[s.id] ?? ""} onChange={(e) => setNotes({ ...notes, [s.id]: e.target.value })} maxLength={300} />
          <div className="flex gap-2"><Button className="flex-1 bg-gold" onClick={() => review(s.id, true)}>Approve & pay</Button><Button variant="outline" className="flex-1" onClick={() => review(s.id, false)}>Reject</Button></div>
        </div>
      ))}
    </div>
  );
}

function Reconcile() {
  const run = useServerFn(reconcileLedger);
  const resync = useServerFn(resyncTransaction);
  const [days, setDays] = useState("7");
  const [onlyIssues, setOnlyIssues] = useState(false);
  const { data, refetch, isFetching, error } = useQuery({
    queryKey: ["reconcile", days],
    queryFn: () => run({ data: { days: Math.max(1, Math.min(90, Number(days) || 7)) } }),
  });
  const rows = (data?.report ?? []).filter((r) => !onlyIssues || r.issue);
  async function fix(ref: string) {
    try { const r = await resync({ data: { reference: ref } }); toast.success(`Result: ${r.result}`); refetch(); }
    catch (e) { toast.error(errMsg(e)); }
  }
  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-wrap items-end gap-3">
        <div><p className="text-xs text-muted-foreground">Last N days</p><Input className="w-24" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))} /></div>
        <Button onClick={() => refetch()} disabled={isFetching}>{isFetching ? "Checking…" : "Run check"}</Button>
        <Button variant={onlyIssues ? "default" : "outline"} onClick={() => setOnlyIssues(!onlyIssues)}>Only mismatches</Button>
      </div>
      {error && <p className="text-sm text-destructive">{errMsg(error)}</p>}
      {data?.providerError && <p className="rounded-lg bg-warning/10 p-3 text-sm">Couldn't reach Paystack: {data.providerError}. Showing ledger only.</p>}
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr className="border-b">
            <th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Reference</th><th className="p-3">Ledger</th><th className="p-3">Paystack</th><th className="p-3">Issue</th><th className="p-3" />
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="p-3 whitespace-nowrap">{shortDate(r.created_at)}</td>
                <td className="p-3 capitalize">{r.type}</td>
                <td className="p-3 font-mono text-xs">{r.reference}</td>
                <td className="p-3">{money(r.amount, "NGN")} <StatusBadge status={r.status} /></td>
                <td className="p-3">{r.providerAmount != null ? money(r.providerAmount, "NGN") : "—"} <span className="text-xs text-muted-foreground">{r.providerStatus ?? ""}</span></td>
                <td className="p-3">{r.issue ? <span className="text-destructive">{r.issue}</span> : <span className="text-success">OK</span>}</td>
                <td className="p-3">{r.status === "pending" && r.reference && <Button size="sm" variant="outline" onClick={() => fix(r.reference!)}>Re-sync</Button>}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Nothing to show.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KycReviews() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["admin-kyc"],
    queryFn: async () => {
      const { data, error } = await supabase.from("kyc_submissions").select("*").eq("status", "pending").order("submitted_at");
      if (error) throw error;
      return data;
    },
  });
  const [notes, setNotes] = useState<Record<string, string>>({});
  async function review(user: string, approve: boolean) {
    const { error } = await supabase.rpc("review_kyc", { _user: user, _approve: approve, _note: notes[user] || null } as never);
    if (error) return toast.error(errMsg(error));
    toast.success(approve ? "Verified" : "Declined");
    qc.invalidateQueries({ queryKey: ["admin-kyc"] });
  }
  if (!data.length) return <p className="py-8 text-center text-sm text-muted-foreground">No pending verifications.</p>;
  return (
    <div className="space-y-3">
      {data.map((k) => (
        <div key={k.user_id} className="space-y-2 rounded-xl border bg-card p-4 text-sm">
          <p className="font-medium">{k.id_type.replace("_", " ").toUpperCase()} ····{k.id_last4}</p>
          <p className="text-muted-foreground">DOB {k.date_of_birth} · {k.address}</p>
          <p className="text-xs text-muted-foreground">User {k.user_id} · {shortDate(k.submitted_at)}</p>
          <Input placeholder="Note (optional)" maxLength={200} value={notes[k.user_id] ?? ""} onChange={(e) => setNotes({ ...notes, [k.user_id]: e.target.value })} />
          <div className="flex gap-2"><Button size="sm" onClick={() => review(k.user_id, true)}>Approve</Button><Button size="sm" variant="outline" onClick={() => review(k.user_id, false)}>Decline</Button></div>
        </div>
      ))}
    </div>
  );
}
