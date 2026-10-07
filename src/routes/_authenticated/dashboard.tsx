import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Tag } from "lucide-react";
import { profileQuery, txnsQuery } from "@/lib/data";
import { BalanceCard } from "@/components/BalanceCard";
import { TxnList } from "@/components/TxnList";
import { RateCalculator } from "@/components/RateCalculator";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — SwiftCard" }, { name: "description", content: "Your wallet overview." }] }),
  component: Dashboard,
});

const actions = [
  { to: "/sell", label: "Sell card", icon: Tag },
  { to: "/wallet", label: "Withdraw", icon: ArrowUpRight },
] as const;

function Dashboard() {
  const { data: txns = [] } = useQuery(txnsQuery(6));
  const { data: me } = useQuery(profileQuery);
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-6">
        {me?.profile && !me.profile.onboarding_completed && (
          <Link to="/onboarding" className="flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-accent p-4 transition hover:shadow-gold">
            <div><p className="font-semibold">Finish setting up your account</p><p className="text-sm text-muted-foreground">Complete your profile and verify your identity.</p></div>
            <span className="text-sm font-medium text-primary">Continue →</span>
          </Link>
        )}
        <BalanceCard />
        <div className="grid grid-cols-2 gap-3">
          {actions.map((a) => (
            <Link key={a.label} to={a.to} className="flex flex-col items-center gap-2 rounded-xl border bg-card p-3 text-xs font-medium transition hover:-translate-y-0.5 hover:shadow-gold">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-accent"><a.icon className="h-4 w-4 text-primary" /></span>
              {a.label}
            </Link>
          ))}
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Recent transactions</h2>
            <Link to="/wallet" className="text-sm text-primary">See all</Link>
          </div>
          <TxnList items={txns} />
        </div>
      </div>
      <div className="min-w-0 rounded-2xl border bg-card p-5 h-fit">
        <h2 className="mb-4 font-semibold">Rate calculator</h2>
        <RateCalculator compact />
      </div>
    </div>
  );
}
