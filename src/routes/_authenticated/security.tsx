import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { kycQuery } from "@/lib/kyc";
import { errMsg } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KycState } from "./onboarding";

export const Route = createFileRoute("/_authenticated/security")({
  head: () => ({ meta: [{ title: "Security — SwiftCard" }, { name: "description", content: "Password, sessions and two-factor authentication." }] }),
  component: Security,
});

function Security() {
  const { data: kyc } = useQuery(kycQuery);
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Security</h1>
      <section className="space-y-3 rounded-2xl border bg-card p-5">
        <h2 className="font-semibold">Identity verification</h2>
        <KycState status={kyc?.status ?? null} note={kyc?.admin_note} />
        {(!kyc || kyc.status === "rejected") && <Button asChild variant="outline"><Link to="/onboarding">{kyc ? "Resubmit details" : "Verify now"}</Link></Button>}
      </section>
      <Password />
      <TwoFactor />
      <Sessions />
    </div>
  );
}

function Password() {
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    if (pw.length < 8) return toast.error("New password must be at least 8 characters");
    if (pw !== pw2) return toast.error("Passwords don't match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw, current_password: cur } as never);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password changed");
    setCur(""); setPw(""); setPw2("");
  }
  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5">
      <h2 className="font-semibold">Change password</h2>
      <div className="space-y-1.5"><Label htmlFor="c">Current password</Label><Input id="c" type="password" value={cur} onChange={(e) => setCur(e.target.value)} /></div>
      <div className="space-y-1.5"><Label htmlFor="n">New password</Label><Input id="n" type="password" value={pw} onChange={(e) => setPw(e.target.value)} maxLength={72} /></div>
      <div className="space-y-1.5"><Label htmlFor="n2">Confirm new password</Label><Input id="n2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} maxLength={72} /></div>
      <Button variant="outline" disabled={busy} onClick={save}>Update password</Button>
    </section>
  );
}

type Factor = { id: string; status: string; friendly_name?: string };

function TwoFactor() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");

  async function load() {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.totp ?? []) as Factor[]);
  }
  useEffect(() => { load(); }, []);
  const active = factors.find((f) => f.status === "verified");

  async function start() {
    // clean up abandoned setups first
    for (const f of factors.filter((f) => f.status !== "verified")) await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${Date.now()}` });
    if (error) return toast.error(error.message);
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }
  async function verify() {
    if (!enroll || !/^\d{6}$/.test(code)) return toast.error("Enter the 6-digit code");
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enroll.id, code });
    if (error) return toast.error(errMsg(error));
    toast.success("Two-factor authentication is on");
    setEnroll(null); setCode(""); load();
  }
  async function disable() {
    if (!active) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: active.id });
    if (error) return toast.error(error.message);
    toast.success("Two-factor authentication turned off");
    load();
  }

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div><h2 className="font-semibold">Two-factor authentication</h2>
          <p className="text-sm text-muted-foreground">Use an authenticator app for a code when you sign in.</p></div>
        <span className={active ? "rounded-full bg-success/15 px-2 py-0.5 text-xs text-success" : "rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"}>{active ? "On" : "Off"}</span>
      </div>
      {active ? <Button variant="outline" onClick={disable}>Turn off</Button> : enroll ? (
        <div className="space-y-3">
          <p className="text-sm">Scan this QR code with Google Authenticator, Authy or similar, then enter the code.</p>
          <img src={enroll.qr} alt="Authenticator QR code" className="h-44 w-44 rounded-lg bg-background p-2" />
          <p className="break-all font-mono text-xs text-muted-foreground">Or enter key: {enroll.secret}</p>
          <div className="flex gap-2">
            <Input inputMode="numeric" maxLength={6} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            <Button className="bg-gold" onClick={verify}>Verify</Button>
          </div>
        </div>
      ) : <Button className="bg-gold" onClick={start}>Set up</Button>}
    </section>
  );
}

function Sessions() {
  const [info, setInfo] = useState<{ lastSignIn?: string | undefined; expires?: number | undefined }>({});
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setInfo({ lastSignIn: data.session?.user.last_sign_in_at, expires: data.session?.expires_at }));
  }, []);
  async function signOutOthers() {
    const { error } = await supabase.auth.signOut({ scope: "others" });
    if (error) return toast.error(error.message);
    toast.success("Signed out of all other devices");
  }
  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5">
      <h2 className="font-semibold">Sessions</h2>
      <div className="rounded-xl border p-4 text-sm">
        <p className="font-medium">This device <span className="ml-1 rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">Active</span></p>
        <p className="mt-1 text-muted-foreground">{typeof navigator !== "undefined" ? (navigator.userAgent.split(")")[0] ?? "").replace("(", "· ") : ""}</p>
        {info.lastSignIn && <p className="text-muted-foreground">Signed in {new Date(info.lastSignIn).toLocaleString()}</p>}
      </div>
      <Button variant="outline" onClick={signOutOthers}>Sign out all other devices</Button>
    </section>
  );
}
