import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile & settings — SwiftCard" }, { name: "description", content: "Manage your account." }] }),
  component: Profile,
});

function Profile() {
  const qc = useQueryClient();
  const { data: me } = useQuery(profileQuery);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cur, setCur] = useState<"NGN" | "USD">("NGN");

  useEffect(() => {
    if (me?.profile) {
      setName(me.profile.full_name ?? "");
      setPhone(me.profile.phone ?? "");
      setCur(me.profile.preferred_currency);
    }
  }, [me]);

  async function save() {
    if (!me) return;
    if (name.length > 100 || phone.length > 20) return toast.error("Too long");
    const { error } = await supabase.from("profiles").update({ full_name: name.trim(), phone: phone.trim(), preferred_currency: cur, updated_at: new Date().toISOString() }).eq("id", me.user.id);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    qc.invalidateQueries({ queryKey: ["profile"] });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Profile & settings</h1>
      <div className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="font-semibold">Personal details</h2>
        <div className="space-y-1.5"><Label>Email</Label><Input value={me?.user.email ?? ""} disabled /></div>
        <div className="space-y-1.5"><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Preferred payout currency</Label>
          <div className="grid grid-cols-2 gap-2">{(["NGN", "USD"] as const).map((c) => <Button key={c} variant={cur === c ? "default" : "outline"} onClick={() => setCur(c)}>{c === "NGN" ? "₦ Naira" : "$ Dollar"}</Button>)}</div>
        </div>
        <Button onClick={save} className="bg-gold">Save changes</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/security" className="rounded-2xl border bg-card p-5 transition hover:shadow-gold"><h2 className="font-semibold">Security</h2><p className="text-sm text-muted-foreground">Password, 2FA, sessions, verification</p></Link>
        <Link to="/transactions" className="rounded-2xl border bg-card p-5 transition hover:shadow-gold"><h2 className="font-semibold">Transaction history</h2><p className="text-sm text-muted-foreground">Search all your activity</p></Link>
      </div>
      <div className="flex items-center justify-between rounded-2xl border bg-card p-5">
        <div><h2 className="font-semibold">Appearance</h2><p className="text-sm text-muted-foreground">Switch between light and dark mode.</p></div>
        <ThemeToggle />
      </div>
    </div>
  );
}
