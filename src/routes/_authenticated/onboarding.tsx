import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/data";
import { kycQuery, ID_TYPES } from "@/lib/kyc";
import { errMsg } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Get started — SwiftCard" }, { name: "description", content: "Set up your profile and verify your identity." }] }),
  component: Onboarding,
});

const steps = ["Profile", "Verify identity", "Done"];
const profileSchema = z.object({ name: z.string().trim().min(2, "Enter your full name").max(100), phone: z.string().trim().regex(/^\+?[0-9 ]{7,20}$/, "Enter a valid phone number") });
const kycSchema = z.object({ idType: z.string().min(1), idNumber: z.string().trim().min(6, "ID number too short").max(30), dob: z.string().min(1, "Enter your date of birth"), address: z.string().trim().min(5, "Enter your address").max(300) });

function Onboarding() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: me } = useQuery(profileQuery);
  const { data: kyc } = useQuery(kycQuery);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cur, setCur] = useState<"NGN" | "USD">("NGN");
  const [idType, setIdType] = useState("nin");
  const [idNumber, setIdNumber] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (me?.profile) { setName(me.profile.full_name ?? ""); setPhone(me.profile.phone ?? ""); setCur(me.profile.preferred_currency); }
  }, [me]);

  async function saveProfile() {
    const p = profileSchema.safeParse({ name, phone });
    if (!p.success || !me) return toast.error(p.error?.issues[0]?.message ?? "Invalid");
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ full_name: p.data.name, phone: p.data.phone, preferred_currency: cur, updated_at: new Date().toISOString() }).eq("id", me.user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["profile"] });
    setStep(1);
  }
  async function submitKyc() {
    const p = kycSchema.safeParse({ idType, idNumber, dob, address });
    if (!p.success) return toast.error(p.error.issues[0]?.message ?? "Invalid");
    setBusy(true);
    const { error } = await supabase.rpc("submit_kyc", { _id_type: p.data.idType, _id_number: p.data.idNumber, _dob: p.data.dob, _address: p.data.address });
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    toast.success("Submitted for review");
    qc.invalidateQueries({ queryKey: ["kyc"] });
    setStep(2);
  }
  async function finish() {
    if (!me) return;
    await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", me.user.id);
    await qc.invalidateQueries({ queryKey: ["profile"] });
    navigate({ to: "/dashboard" });
  }

  const showForm = step === 1 && (!kyc || kyc.status === "rejected");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Let's set up your account</h1>
        <p className="text-sm text-muted-foreground">Step {step + 1} of {steps.length}</p>
      </div>
      <ol className="flex items-center gap-2">
        {steps.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs font-semibold transition",
              i < step ? "border-primary bg-primary text-primary-foreground" : i === step ? "border-primary text-primary" : "text-muted-foreground")}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className={cn("hidden text-sm sm:block", i === step ? "font-medium" : "text-muted-foreground")}>{s}</span>
            {i < steps.length - 1 && <span className={cn("h-px flex-1", i < step ? "bg-primary" : "bg-border")} />}
          </li>
        ))}
      </ol>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all duration-500" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>

      <div className="space-y-4 rounded-2xl border bg-card p-5 animate-in fade-in">
        {step === 0 && (<>
          <h2 className="font-semibold">Your profile</h2>
          <div className="space-y-1.5"><Label htmlFor="n">Full name</Label><Input id="n" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></div>
          <div className="space-y-1.5"><Label htmlFor="p">Phone number</Label><Input id="p" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 800 000 0000" maxLength={20} /></div>
          <div className="space-y-1.5"><Label>Preferred payout currency</Label>
            <div className="grid grid-cols-2 gap-2">{(["NGN", "USD"] as const).map((c) => <Button key={c} type="button" variant={cur === c ? "default" : "outline"} onClick={() => setCur(c)}>{c === "NGN" ? "₦ Naira" : "$ Dollar"}</Button>)}</div>
          </div>
          <Button className="w-full bg-gold" disabled={busy} onClick={saveProfile}>Continue</Button>
        </>)}

        {step === 1 && kyc && kyc.status !== "rejected" && (<>
          <KycState status={kyc.status} note={kyc.admin_note} />
          <Button className="w-full bg-gold" onClick={() => setStep(2)}>Continue</Button>
        </>)}
        {step === 1 && kyc?.status === "rejected" && <KycState status="rejected" note={kyc.admin_note} />}
        {showForm && (<>
          <h2 className="font-semibold">Verify your identity</h2>
          <p className="text-sm text-muted-foreground">We only store the last 4 digits of your ID number.</p>
          <div className="space-y-1.5"><Label htmlFor="t">ID type</Label>
            <select id="t" value={idType} onChange={(e) => setIdType(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              {ID_TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select></div>
          <div className="space-y-1.5"><Label htmlFor="i">ID number</Label><Input id="i" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} maxLength={30} /></div>
          <div className="space-y-1.5"><Label htmlFor="d">Date of birth</Label><Input id="d" type="date" value={dob} onChange={(e) => setDob(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="a">Home address</Label><Input id="a" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} /></div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
            <Button variant="ghost" onClick={() => setStep(2)}>Skip for now</Button>
            <Button className="flex-1 bg-gold" disabled={busy} onClick={submitKyc}>Submit</Button>
          </div>
        </>)}

        {step === 2 && (<div className="space-y-4 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/15"><Check className="h-7 w-7 text-success" /></span>
          <h2 className="text-lg font-semibold">You're all set</h2>
          <p className="text-sm text-muted-foreground">{kyc ? "We'll notify you once your identity is reviewed." : "You can verify your identity any time from Security settings."}</p>
          <Button className="w-full bg-gold" onClick={finish}>Go to dashboard</Button>
        </div>)}
      </div>
    </div>
  );
}

export function KycState({ status, note }: { status: "pending" | "verified" | "rejected" | null; note?: string | null | undefined }) {
  const map = {
    pending: { icon: Clock, cls: "bg-warning/15 text-warning", t: "Verification in review", d: "This usually takes less than 24 hours." },
    verified: { icon: ShieldCheck, cls: "bg-success/15 text-success", t: "Identity verified", d: "Your account has full access." },
    rejected: { icon: XCircle, cls: "bg-destructive/15 text-destructive", t: "Verification declined", d: note || "Please check your details and resubmit." },
    none: { icon: ShieldCheck, cls: "bg-muted text-muted-foreground", t: "Not verified", d: "Verify your identity to unlock higher limits." },
  } as const;
  const m = map[status ?? "none"];
  return (
    <div className="flex items-start gap-3 rounded-xl border p-4">
      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", m.cls)}><m.icon className="h-5 w-5" /></span>
      <div><p className="font-medium">{m.t}</p><p className="text-sm text-muted-foreground">{m.d}</p></div>
    </div>
  );
}
