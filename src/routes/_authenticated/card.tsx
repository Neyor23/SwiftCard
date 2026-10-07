import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clock, CreditCard, Globe, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/data";
import { errMsg, money } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/card")({
  head: () => ({ meta: [{ title: "Virtual USD card — SwiftCard" }, { name: "description", content: "Create and fund your virtual dollar card." }] }),
  component: CardPage,
});

function CardPage() {
  const qc = useQueryClient();
  const { data: me } = useQuery(profileQuery);
  const { data: card, isLoading } = useQuery({
    queryKey: ["vcard"], enabled: !!me,
    queryFn: async () => (await supabase.from("virtual_cards").select("*").eq("user_id", me!.user.id).maybeSingle()).data,
  });

  async function request() {
    const { error } = await supabase.rpc("request_virtual_card");
    if (error) return toast.error(errMsg(error));
    toast.success("Card requested");
    qc.invalidateQueries();
  }

  const active = card?.status === "active";
  const name = me?.profile?.full_name || me?.user.email?.split("@")[0] || "Card holder";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Virtual USD card</h1>
        <p className="text-sm text-muted-foreground">Shop online and pay subscriptions worldwide.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="relative aspect-[1.586] max-w-md overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-800 via-zinc-900 to-black p-6 text-white shadow-gold">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gold opacity-30 blur-2xl" />
          <div className="relative flex h-full flex-col justify-between">
            <div className="flex justify-between"><span className="font-display font-semibold">SwiftCard</span><span className="text-sm opacity-70">USD</span></div>
            <p className="font-mono text-xl tracking-widest">•••• •••• •••• {card?.last4 ?? "0000"}</p>
            <div className="flex items-end justify-between text-sm">
              <div><p className="text-[10px] uppercase opacity-60">Card holder</p><p>{name}</p></div>
              <div className="text-right"><p className="text-[10px] uppercase opacity-60">Balance</p><p className="font-semibold">{money(card?.balance_usd ?? 0, "USD")}</p></div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          {isLoading ? null : !card ? (
            <div className="space-y-4">
              <h2 className="font-semibold">Get your dollar card</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2"><Globe className="h-4 w-4 text-primary" /> Accepted on Netflix, Spotify, Amazon, and more</li>
                <li className="flex gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Freeze or unfreeze anytime</li>
                <li className="flex gap-2"><CreditCard className="h-4 w-4 text-primary" /> Fund directly from your $ wallet</li>
              </ul>
              <Button onClick={request} className="w-full bg-gold shadow-gold">Request virtual card</Button>
            </div>
          ) : !active ? (
            <div className="space-y-3">
              <Clock className="h-6 w-6 text-warning" />
              <h2 className="font-semibold">Your card is being issued</h2>
              <p className="text-sm text-muted-foreground">We'll notify you as soon as it's ready. Full card number, CVV and expiry will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <Clock className="h-6 w-6 text-warning" />
              <h2 className="font-semibold">Card funding coming soon</h2>
              <p className="text-sm text-muted-foreground">Funding will open once our card partner goes live.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
