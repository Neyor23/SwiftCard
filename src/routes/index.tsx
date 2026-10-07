import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, CreditCard, ShieldCheck, Wallet, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/lib/theme";
import { RateCalculator } from "@/components/RateCalculator";
import { BRANDS, BRAND_COLORS } from "@/lib/format";
import { FlyingCards } from "@/components/FlyingCards";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SwiftCard — Sell gift cards at top rates" },
      { name: "description", content: "Trade Apple, Amazon, Steam and more. Get paid in Naira or Dollars, withdraw to your bank, and get a virtual USD card." },
      { property: "og:title", content: "SwiftCard — Sell gift cards at top rates" },
      { property: "og:description", content: "Trade gift cards and get paid into your Naira or Dollar wallet." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Zap, title: "Fast payouts", text: "Cards reviewed quickly, money lands straight in your wallet." },
  { icon: Wallet, title: "₦ and $ wallet", text: "Hold both currencies, convert anytime, withdraw to any Nigerian bank." },
  { icon: CreditCard, title: "Virtual USD card", text: "Pay for subscriptions and shop online worldwide." },
  { icon: ShieldCheck, title: "Bank-grade security", text: "Encrypted accounts and every transaction tracked end to end." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" className="hidden sm:inline-flex"><Link to="/auth">Sign in</Link></Button>
            <Button asChild className="bg-gold shadow-gold"><Link to="/auth" search={{ mode: "signup" }}>Get started</Link></Button>
          </div>
        </div>
      </header>

      <div className="relative isolate">
      <FlyingCards />
      <section className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 md:grid-cols-2 md:py-24">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
            <BadgeCheck className="h-3.5 w-3.5 text-primary" /> Trusted by traders across Nigeria
          </span>
          <h1 className="mt-5 text-4xl font-semibold leading-tight md:text-6xl">
            Turn gift cards into <span className="bg-gold bg-clip-text text-transparent">real money</span>.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">
            Sell Apple, Amazon, Steam and more at the best rates. Get paid in Naira or Dollars and withdraw anytime.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-gold shadow-gold">
              <Link to="/auth" search={{ mode: "signup" }}>Start trading <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline"><Link to="/auth">I have an account</Link></Button>
          </div>
          <div className="mt-10 flex flex-wrap gap-2">
            {BRANDS.map((b) => (
              <span key={b} className={`rounded-lg bg-gradient-to-br ${BRAND_COLORS[b]} px-3 py-1.5 text-xs font-semibold text-white`}>{b}</span>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-gold animate-in fade-in zoom-in-95 duration-700">
          <h2 className="text-lg font-semibold">Check today's rate</h2>
          <p className="mb-5 text-sm text-muted-foreground">See exactly what you'll get before you sell.</p>
          <RateCalculator />
        </div>
      </section>
      </div>

      <section className="border-t bg-card/40">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-6 transition hover:-translate-y-1 hover:shadow-gold">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-3xl font-semibold">How it works</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {["Create your free account", "Submit your card for review", "Get paid and withdraw to your bank"].map((s, i) => (
            <div key={s} className="rounded-2xl border p-6">
              <span className="font-display text-4xl font-semibold text-primary">0{i + 1}</span>
              <p className="mt-3 font-medium">{s}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">© {new Date().getFullYear()} SwiftCard. All rights reserved.</footer>
    </div>
  );
}
