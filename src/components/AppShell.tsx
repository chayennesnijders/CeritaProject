import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CallProvider } from "@/components/CallProvider";
import { BirthdayPopup } from "@/components/BirthdayPopup";
import { AppLock } from "@/components/AppLock";
import { WelcomeTour } from "@/components/WelcomeTour";
import { toast } from "sonner";
import { listenForeground } from "@/lib/push-client";
import { Home, Users, Compass, MessageCircle, User, PawPrint, ShoppingBag, Shield } from "lucide-react";
import { useMe, ageGroupFor } from "@/lib/auth";
import { useUnreadCounts, badgeLabel } from "@/lib/unread";
import { supabase } from "@/integrations/supabase/client";

const tabs = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/community", label: "Community", icon: Users },
  { to: "/ontdekken", label: "Ontdekken", icon: Compass },
  { to: "/berichten", label: "Berichten", icon: MessageCircle },
  { to: "/profiel", label: "Profiel", icon: User },
] as const;

export function AppShell() {
  const { data: me } = useMe();
  const unread = useUnreadCounts();
  const navigate = useNavigate();
  // Na inloggen met Google: laten weten dat het gelukt is (er komt geen mail).
  // We kijken naar het inlogmoment zelf, want bij Google kan de app in een ander
  // tabblad terugkomen en is tijdelijke opslag dan weg.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (cancelled || !u?.last_sign_in_at) return;
      const viaGoogle = u.app_metadata?.provider === "google" || u.identities?.some((i) => i.provider === "google");
      const fresh = Date.now() - new Date(u.last_sign_in_at).getTime() < 5 * 60 * 1000;
      const key = `google-welcome:${u.id}`;
      if (!viaGoogle || !fresh || localStorage.getItem(key) === u.last_sign_in_at) return;
      localStorage.setItem(key, u.last_sign_in_at);
      const isNew = Date.now() - new Date(u.created_at).getTime() < 10 * 60 * 1000;
      setTimeout(() => toast.success(
        isNew ? "Welkom! Je account is aangemaakt met Google. Je hoeft geen mail te bevestigen." : "Gelukt! Je bent ingelogd met Google. Je hoeft geen mail te bevestigen.",
        { duration: 8000 },
      ), 400);
    });
    return () => { cancelled = true; };
  }, []);
  // Meldingen die binnenkomen terwijl de app open is, tonen we als pop-up bovenin.
  useEffect(() => {
    let stop: () => void = () => {};
    listenForeground((p) => {
      if (p.link && window.location.pathname === p.link) return;
      if (p.title.includes("Inkomend")) return; // het belscherm verschijnt al vanzelf // je zit al in dit gesprek
      toast(p.title, { description: p.body, action: p.link ? { label: "Openen", onClick: () => navigate({ to: p.link! }) } : undefined });
    }).then((fn) => { stop = fn; }).catch(() => {});
    return () => stop();
  }, [navigate]);
  // Leden vanaf 28 zien de community niet meer; de rest van de app blijft beschikbaar.
  const band = me?.profile?.birthdate ? ageGroupFor(new Date(me.profile.birthdate)) : null;
  const visibleTabs = tabs.filter((t) => band !== "no_community" || (t.to !== "/community" && t.to !== "/berichten"));
  return (
    <AppLock>
    <CallProvider>
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      <BirthdayPopup />
      <WelcomeTour />
      <header className="sticky top-0 z-20 flex items-center justify-between rounded-b-3xl bg-ink px-5 py-2 text-ink-foreground">
        <Link to="/home" aria-label="Cerita Project"><img src="/cerita-beer.png" alt="Cerita Project" className="size-12 rounded-full bg-[#faf3ea] object-cover" /></Link>
        <div className="flex items-center gap-1">
          {me?.isAdmin && (
            <Link to="/beheer" aria-label="Beheer" className="relative rounded-full p-2 text-ink-foreground hover:bg-secondary hover:text-secondary-foreground" activeProps={{ className: "bg-secondary" }}>
              <Shield className="size-5" />
              <TabBadge n={unread.reports} />
            </Link>
          )}
          <Link to="/diertje" data-tour="diertje" aria-label="Mijn diertje" className="rounded-full p-2 text-ink-foreground hover:bg-secondary hover:text-secondary-foreground" activeProps={{ className: "bg-secondary" }}>
            <PawPrint className="size-5" />
          </Link>
          <Link to="/shop" data-tour="shop" aria-label="CeritaShop" className="rounded-full p-2 text-ink-foreground hover:bg-secondary hover:text-secondary-foreground" activeProps={{ className: "bg-secondary" }}>
            <ShoppingBag className="size-5" />
          </Link>
        </div>
      </header>
      <main className="flex-1 px-5 pb-28">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <div className="flex justify-around rounded-3xl border-2 border-secondary bg-ink px-2 py-2 text-ink-foreground shadow-soft">
          {visibleTabs.map(({ to, label, icon: Icon }) => {
            const n = to === "/berichten" ? unread.dmTotal + unread.requests : to === "/community" ? unread.groupTotal : 0;
            return (
              <Link
                key={to}
                data-tour={to.slice(1)}
                to={to}
                className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] opacity-70"
                activeProps={{ className: "bg-secondary text-secondary-foreground opacity-100" }}
              >
                <span className="relative">
                  <Icon className="size-5" />
                  <TabBadge n={n} />
                </span>
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
    </CallProvider>
    </AppLock>
  );
}

/** Roze plantje met een aantal, bijvoorbeeld ongelezen berichten. */
export function TabBadge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-ink bg-accent px-1 text-[10px] font-bold leading-none text-accent-foreground">
      {badgeLabel(n)}
    </span>
  );
}

export function SoonCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-4 rounded-3xl border border-dashed border-primary/30 bg-card p-6 text-center">
      <span className="inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">Binnenkort</span>
      <h2 className="mt-3 text-2xl text-primary">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
