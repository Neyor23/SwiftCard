import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Copy } from "lucide-react";
import { toast } from "sonner";
import { txnsQuery } from "@/lib/data";
import { money, type Currency } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/TxnList";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/transactions")({
  head: () => ({ meta: [{ title: "Transaction history — SwiftCard" }, { name: "description", content: "Search and review all your wallet activity." }] }),
  component: Transactions,
});

const types = ["all", "sell", "withdrawal"] as const;
const statuses = ["all", "successful", "pending", "failed"] as const;
const incoming = new Set(["sell", "deposit"]);

function Transactions() {
  const { data: txns = [], isLoading } = useQuery(txnsQuery(500));
  const [q, setQ] = useState("");
  const [type, setType] = useState<(typeof types)[number]>("all");
  const [status, setStatus] = useState<(typeof statuses)[number]>("all");
  const [open, setOpen] = useState<(typeof txns)[number] | null>(null);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return txns.filter((t) =>
      (type === "all" || t.type === type) &&
      (status === "all" || t.status === status) &&
      (!s || [t.description, t.reference, t.type, String(t.amount)].some((v) => v?.toLowerCase().includes(s))));
  }, [txns, q, type, status]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Transaction history</h1>
      <div className="space-y-3 rounded-2xl border bg-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by description, reference or amount" value={q} onChange={(e) => setQ(e.target.value)} maxLength={100} />
        </div>
        <div className="flex flex-wrap gap-2">
          {types.map((t) => <Chip key={t} on={type === t} onClick={() => setType(t)}>{t === "all" ? "All types" : t.replace("_", " ")}</Chip>)}
        </div>
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => <Chip key={s} on={status === s} onClick={() => setStatus(s)}>{s === "all" ? "Any status" : s}</Chip>)}
        </div>
      </div>
      <div className="rounded-2xl border bg-card">
        {isLoading ? <p className="p-8 text-center text-sm text-muted-foreground">Loading…</p> :
          list.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No matching transactions.</p> :
          <ul className="divide-y">
            {list.map((t) => (
              <li key={t.id}>
                <button onClick={() => setOpen(t)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-accent/50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium capitalize">{t.description || t.type.replace("_", " ")}</p>
                    <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()} · {t.reference}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-sm font-semibold", incoming.has(t.type) && "text-success")}>{incoming.has(t.type) ? "+" : "−"}{money(t.amount, t.currency as Currency)}</p>
                    <StatusBadge status={t.status} />
                  </div>
                </button>
              </li>
            ))}
          </ul>}
      </div>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Transaction details</DialogTitle></DialogHeader>
          {open && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-3xl font-semibold">{incoming.has(open.type) ? "+" : "−"}{money(open.amount, open.currency as Currency)}</p>
                <div className="mt-2"><StatusBadge status={open.status} /></div>
              </div>
              <dl className="divide-y rounded-xl border text-sm">
                <Row k="Type" v={open.type.replace("_", " ")} />
                <Row k="Description" v={open.description ?? "—"} />
                <Row k="Currency" v={open.currency} />
                <Row k="Date" v={new Date(open.created_at).toLocaleString()} />
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <dt className="text-muted-foreground">Reference</dt>
                  <dd className="flex items-center gap-1 font-mono text-xs">{open.reference}
                    <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Copy reference" onClick={() => { navigator.clipboard.writeText(open.reference ?? ""); toast.success("Copied"); }}><Copy className="h-3 w-3" /></Button>
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3 px-3 py-2"><dt className="text-muted-foreground">{k}</dt><dd className="text-right capitalize">{v}</dd></div>;
}
function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={cn("rounded-full border px-3 py-1 text-xs capitalize transition", on ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{children}</button>;
}
