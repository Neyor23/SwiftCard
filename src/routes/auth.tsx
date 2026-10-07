import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { FlyingCards } from "@/components/FlyingCards";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { mode?: "signup" } => (s["mode"] === "signup" ? { mode: "signup" } : {}),
  head: () => ({
    meta: [
      { title: "Sign in — SwiftCard" },
      { name: "description", content: "Sign in or create your SwiftCard account." },
      { property: "og:title", content: "Sign in — SwiftCard" },
      { property: "og:description", content: "Access your gift card wallet." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
  name: z.string().trim().max(100).optional(),
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(search.mode === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate({ to: "/dashboard", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        toast.success("Check your email for a reset link");
        return;
      }
      const parsed = schema.safeParse({ email, password, name });
      if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: parsed.data.name } },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error("Google sign-in failed");
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative isolate hidden flex-col justify-between overflow-hidden bg-gold p-10 text-primary-foreground md:flex [&>*:not(:first-child)]:relative">
        <FlyingCards fade={false} />
        <Logo />
        <div>
          <h2 className="text-4xl font-semibold leading-tight">Your gift cards,<br />your money, instantly.</h2>
          <p className="mt-4 max-w-sm opacity-80">Join thousands trading gift cards safely with a Naira and Dollar wallet.</p>
        </div>
        <p className="text-sm opacity-70">Secure • Fast • Reliable</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5 animate-in fade-in slide-in-from-bottom-2">
          <div className="md:hidden"><Logo /></div>
          <div>
            <h1 className="text-2xl font-semibold">{mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset password" : "Welcome back"}</h1>
            <p className="text-sm text-muted-foreground">{mode === "signup" ? "Start trading in minutes." : mode === "forgot" ? "We'll email you a reset link." : "Sign in to your wallet."}</p>
          </div>
          {mode !== "forgot" && (
            <>
              <Button type="button" variant="outline" className="w-full" onClick={google}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1H12v2.9h5.35c-.23 1.5-1.7 4.4-5.35 4.4a5.9 5.9 0 010-11.8c1.8 0 3 .77 3.7 1.43l2.5-2.4A9.5 9.5 0 0012 2.5a9.5 9.5 0 100 19c5.5 0 9.1-3.85 9.1-9.3 0-.62-.07-1.1-.15-1.6z" /></svg>
                Continue with Google
              </Button>
              <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
            </>
          )}
          {mode === "signup" && (
            <div className="space-y-1.5"><Label htmlFor="name">Full name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} /></div>
          )}
          <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          {mode !== "forgot" && (
            <div className="space-y-1.5">
              <div className="flex justify-between"><Label htmlFor="pw">Password</Label>
                {mode === "signin" && <button type="button" className="text-xs text-primary" onClick={() => setMode("forgot")}>Forgot?</button>}
              </div>
              <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          )}
          <Button type="submit" disabled={busy} className="w-full bg-gold shadow-gold">
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Already have an account? " : "New here? "}
            <button type="button" className="font-medium text-primary" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>
              {mode === "signup" ? "Sign in" : "Create account"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
