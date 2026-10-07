import { ArrowDownLeft, ArrowUpRight, CreditCard, ShoppingBag, Tag } from "lucide-react";
import { money, shortDate, type Currency } from "@/lib/format";
import { cn } from "@/lib/utils";

type Txn = { id: string; type: string; status: string; amount: number; currency: string; description: string | null; created_at: string; reference: string | null };

const icons: Record<string, typeof Tag> = { sell: Tag, buy: ShoppingBag, deposit: ArrowDownLeft, withdrawal: ArrowUpRight, card_funding: CreditCard };
const incoming = new Set(["sell", "deposit"]);

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
      status === "successful" && "bg-success/15 text-success",
      status === "pending" && "bg-warning/15 text-warning",
      status === "failed" && "bg-destructive/15 text-destructive")}>
      {status}
    </span>
  );
}

export function TxnList({ items }: { items: Txn[] }) {
  if (!items.length) return <p className="py-10 text-center text-sm text-muted-foreground">No transactions yet.</p>;
  return (
    <ul className="divide-y">
      {items.map((t) => {
        const Icon = icons[t.type] ?? Tag;
        return (
          <li key={t.id} className="flex items-center gap-3 py-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent"><Icon className="h-4 w-4 text-primary" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium capitalize">{t.description || t.type.replace("_", " ")}</p>
              <p className="text-xs text-muted-foreground">{shortDate(t.created_at)} · {t.type.replace("_", " ")}</p>
            </div>
            <div className="text-right">
              <p className={cn("text-sm font-semibold", incoming.has(t.type) ? "text-success" : "")}>
                {incoming.has(t.type) ? "+" : "−"}{money(t.amount, t.currency as Currency)}
              </p>
              <StatusBadge status={t.status} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
