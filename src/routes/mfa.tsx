import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/mfa")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Two-factor check — SwiftCard" },
    { name: "description", content: "Enter your authenticator code to continue." },
    { property: "og:title", content: "Two-factor check — SwiftCard" },
    { property: "og:description", content: "Confirm it's you with your authenticator app." },
  ] }),
  component: Mfa,
});

function Mfa() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { data } = await supabase.auth.mfa.listFactors();
    const f = data?.totp.find((x) => x.status === "verified");
    if (!f) return navigate({ to: "/dashboard" });
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: f.id, code });
    if (error) return toast.error("Incorrect code");
    navigate({ to: "/dashboard", replace: true });
  }
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <Logo />
        <h1 className="text-2xl font-semibold">Enter your 6-digit code</h1>
        <p className="text-sm text-muted-foreground">Open your authenticator app to get the code.</p>
        <Input inputMode="numeric" autoFocus maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
        <Button className="w-full bg-gold">Verify</Button>
        <button type="button" className="w-full text-sm text-muted-foreground" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}>Sign out</button>
      </form>
    </div>
  );
}
