import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { newPasswordError } from "@/lib/password-errors";
import { readOAuthReturn } from "@/lib/oauth-return";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nieuw wachtwoord — CeritaProject" },
      { name: "description", content: "Kies een nieuw wachtwoord voor je CeritaProject-account." },
      { property: "og:title", content: "Nieuw wachtwoord — CeritaProject" },
      { property: "og:description", content: "Kies een nieuw wachtwoord voor je CeritaProject-account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPage,
});

/**
 * Choose a new password. Reached from /bevestig (the email link) with a session already set, or
 * from an older link with tokens in the address. Without a session the page says so and offers a new
 * link right here, instead of failing on Save.
 */
function ResetPage() {
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<"checking" | "ready" | "broken">("checking");
  const [reason, setReason] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let done = false;
    const ready = () => {
      if (!done) {
        done = true;
        setState("ready");
      }
    };
    const back = readOAuthReturn(window.location.href);
    if (back.kind === "error") {
      setReason(back.message);
      setState("broken");
      return;
    }
    if (back.kind === "tokens")
      void supabase.auth
        .setSession({ access_token: back.accessToken, refresh_token: back.refreshToken })
        .then(({ data }) => data.session && ready());
    if (back.kind === "code")
      void supabase.auth.exchangeCodeForSession(back.code).then(({ data }) => data.session && ready());
    void supabase.auth.getSession().then(({ data }) => data.session && ready());
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => session && ready());
    // Give the address a moment to be read; no session after that means the link no longer works.
    const t = setTimeout(() => {
      if (!done) setState("broken");
    }, 2500);
    return () => {
      clearTimeout(t);
      sub.subscription.unsubscribe();
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== pw2) {
      toast.error("De wachtwoorden zijn niet hetzelfde");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      toast.error(newPasswordError(error));
      return;
    }
    toast.success("Je nieuwe wachtwoord is opgeslagen");
    nav({ to: "/home" });
  }

  async function newLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setBusy(false);
    if (error) {
      toast.error("Versturen lukte niet. Wacht een minuutje en probeer het opnieuw.");
      return;
    }
    setSent(true);
  }

  return (
    <div className="mx-auto min-h-screen max-w-md px-6 py-10">
      <img src="/cerita-logo.webp" alt="CeritaProject" className="size-24 rounded-3xl" />
      <h1 className="mt-8 text-4xl text-foreground">Nieuw wachtwoord</h1>
      {state === "checking" && <p className="mt-6 text-sm text-muted-foreground">Even je link controleren…</p>}
      {state === "ready" && (
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <Label htmlFor="p1">Nieuw wachtwoord</Label>
            <Input id="p1" type="password" autoComplete="new-password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} className="mt-1 h-12 rounded-2xl" />
          </div>
          <div>
            <Label htmlFor="p2">Nog een keer</Label>
            <Input id="p2" type="password" autoComplete="new-password" minLength={8} required value={pw2} onChange={(e) => setPw2(e.target.value)} className="mt-1 h-12 rounded-2xl" />
          </div>
          <Button disabled={busy} className="h-12 w-full rounded-full">
            Opslaan
          </Button>
        </form>
      )}
      {state === "broken" &&
        (sent ? (
          <div className="mt-6 space-y-2 rounded-3xl bg-secondary p-5 text-secondary-foreground">
            <p className="text-2xl">💌</p>
            <p>Check je e-mail en tik op de knop in de nieuwe mail. Niet gezien? Kijk ook in je spam- of reclamemap.</p>
          </div>
        ) : (
          <form onSubmit={newLink} className="mt-6 space-y-4">
            <p role="alert" className="rounded-2xl bg-destructive/10 p-3 text-sm">
              ⚠️ Deze link werkt niet (meer). Dat gebeurt als hij al gebruikt is of te oud is.
              {reason ? <span className="mt-1 block text-xs opacity-70">{reason}</span> : null}
            </p>
            <p className="text-sm text-muted-foreground">Vul je e-mail in, dan sturen we meteen een nieuwe link.</p>
            <div>
              <Label htmlFor="mail">E-mail</Label>
              <Input id="mail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 h-12 rounded-2xl" />
            </div>
            <Button disabled={busy} className="h-12 w-full rounded-full">
              {busy ? "Versturen…" : "Stuur een nieuwe link"}
            </Button>
          </form>
        ))}
    </div>
  );
}
