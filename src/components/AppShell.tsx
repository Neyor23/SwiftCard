import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Bell, Menu, X, CreditCard, History, LayoutDashboard, Lock, LogOut, ShieldCheck, Tag, User, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notificationsQuery, profileQuery } from "@/lib/data";
import { Logo } from "./Logo";
import { FlyingCards } from "./FlyingCards";
import { ThemeToggle } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { shortDate } from "@/lib/format";

const nav = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/sell", label: "Sell", icon: Tag },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/card", label: "Card", icon: CreditCard },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: me } = useQuery(profileQuery);
  const { data: notes = [] } = useQuery(notificationsQuery);
  const unread = notes.filter((n) => !n.read).length;
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { setCollapsed(localStorage.getItem("sidebar-open") !== "1"); }, []);
  function toggle() {
    if (window.innerWidth < 768) return setMobileOpen((o) => !o);
    setCollapsed((c) => { localStorage.setItem("sidebar-open", c ? "1" : "0"); return !c; });
  }
  const links = [...nav, { to: "/transactions", label: "History", icon: History }, { to: "/security", label: "Security", icon: Lock }, ...(me?.isAdmin ? [{ to: "/admin", label: "Admin", icon: ShieldCheck }] : [])] as { to: string; label: string; icon: typeof History }[];
  const w = collapsed ? "72px" : "240px";
  const SideNav = ({ mini }: { mini: boolean }) => (
    <>
      <div className={mini ? "flex justify-center" : ""}>{mini ? <button onClick={toggle} aria-label="Open menu" className="rounded-lg p-2 text-muted-foreground hover:bg-sidebar-accent"><Menu className="h-5 w-5" /></button> : <div className="flex items-center justify-between"><Logo /><button onClick={toggle} aria-label="Close menu" className="rounded-lg p-2 text-muted-foreground hover:bg-sidebar-accent"><X className="h-4 w-4" /></button></div>}</div>
      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {links.map((n) => (
          <Link key={n.to} to={n.to} title={n.label} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-lg py-2 text-sm text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground ${mini ? "justify-center px-0" : "px-3"}`}
            activeProps={{ className: "!bg-sidebar-accent !text-foreground font-medium" }}>
            <n.icon className="h-4 w-4 shrink-0" />{!mini && n.label}
          </Link>
        ))}
      </nav>
      <Button variant="ghost" title="Sign out" className={mini ? "justify-center px-0 text-muted-foreground" : "justify-start text-muted-foreground"} onClick={signOut}><LogOut className={mini ? "h-4 w-4" : "mr-2 h-4 w-4"} />{!mini && "Sign out"}</Button>
    </>
  );

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  async function markRead() {
    if (!unread || !me) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", me.user.id).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <div className="sb-grid min-h-screen md:grid md:transition-[grid-template-columns] md:duration-300">
      <style>{`@media (min-width:768px){.sb-grid{grid-template-columns:${w} 1fr}[data-sb]{left:${w}}}`}</style>
      <aside className="sticky top-0 hidden h-screen flex-col overflow-hidden border-r bg-sidebar p-4 md:flex">
        <SideNav mini={collapsed} />
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r bg-sidebar p-4 animate-in slide-in-from-left duration-200"><SideNav mini={false} /></aside>
        </div>
      )}

      <div className="relative isolate flex min-h-screen flex-col pb-20 md:pb-0">
        <div className="pointer-events-none fixed inset-0 isolate opacity-60 md:transition-[left] md:duration-300" style={{ left: undefined }} data-sb><FlyingCards fade={false} /></div>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-1 md:hidden"><Button variant="ghost" size="icon" onClick={toggle} aria-label="Open menu"><Menu className="h-5 w-5" /></Button><Logo /></div>
          <p className="hidden text-sm text-muted-foreground md:block">Hi, {me?.profile?.full_name?.split(" ")[0] || me?.user.email}</p>
          <div className="flex items-center gap-1">
            {me?.isAdmin && <Button asChild variant="ghost" size="icon" className="md:hidden"><Link to="/admin" aria-label="Admin"><ShieldCheck className="h-4 w-4" /></Link></Button>}
            <ThemeToggle />
            <Popover onOpenChange={(o) => o && markRead()}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
                  <Bell className="h-4 w-4" />
                  {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <p className="border-b px-4 py-3 text-sm font-semibold">Notifications</p>
                <div className="max-h-80 overflow-y-auto">
                  {notes.length === 0 && <p className="p-4 text-sm text-muted-foreground">You're all caught up.</p>}
                  {notes.map((n) => (
                    <div key={n.id} className="border-b px-4 py-3 last:border-0">
                      <p className="text-sm font-medium">{n.title}</p>
                      {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
                      <p className="mt-1 text-[11px] text-muted-foreground">{shortDate(n.created_at)}</p>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={signOut} aria-label="Sign out"><LogOut className="h-4 w-4" /></Button>
          </div>
        </header>
        <main className="relative mx-auto w-full min-w-0 max-w-6xl flex-1 overflow-x-hidden p-4 md:p-8 animate-in fade-in duration-300">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t bg-background/95 backdrop-blur md:hidden">
        {nav.map((n) => (
          <Link key={n.to} to={n.to} className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground" activeProps={{ className: "!text-primary" }}>
            <n.icon className="h-5 w-5" />{n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
