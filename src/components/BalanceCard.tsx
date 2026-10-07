import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { walletQuery } from "@/lib/data";
import { money } from "@/lib/format";

export function BalanceCard() {
  const { data: w } = useQuery(walletQuery);
  const [hide, setHide] = useState(false);
  const show = (v: string) => (hide ? "••••••" : v);
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gold p-6 text-primary-foreground shadow-gold">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-background/10" />
      <div className="flex items-center justify-between">
        <p className="text-sm opacity-80">Naira balance</p>
        <button type="button" onClick={() => setHide((h) => !h)} aria-label={hide ? "Show balance" : "Hide balance"} className="relative z-10 -m-2 rounded-full p-2 hover:bg-background/15">{hide ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
      </div>
      <p className="mt-1 break-all font-display text-3xl font-semibold sm:text-4xl">{show(money(w?.balance_ngn ?? 0, "NGN"))}</p>
      <div className="mt-5 inline-flex max-w-full flex-wrap items-center gap-2 rounded-lg bg-background/15 px-3 py-1.5 text-sm">
        <span className="opacity-80">USD</span><span className="font-semibold">{show(money(w?.balance_usd ?? 0, "USD"))}</span>
      </div>
    </div>
  );
}
