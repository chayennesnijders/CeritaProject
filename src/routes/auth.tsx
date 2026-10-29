import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ageGroupFor } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Inloggen — CeritaProject" },
      { name: "description", content: "Log in of maak een account aan bij CeritaProject." },
      { property: "og:title", content: "Inloggen — CeritaProject" },
      { property: "og:description", content: "Log in of maak een account aan bij CeritaProject." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "forgot" | "resend">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  // Terug van Google (of al ingelogd)? Dan meteen door naar de app,
  // in plaats van opnieuw het e-mailformulier te tonen.
  useEffect(() => {
    let done = false;
    const go = () => { if (!done) { done = true; nav({ to: "/home" }); } };
    supabase.auth.getSession().then(({ data }) => { if (data.session) go(); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) go();
    });
    return () => sub.subscription.unsubscribe();
  }, [nav]);


  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
        if (error) throw error;
        setSent(true);
        return;
      }
      if (mode === "resend") {
        const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: window.location.origin + "/home" } });
        if (error) throw error;
        setSent(true);
        return;
      }
      if (mode === "up") {
        const g = ageGroupFor(new Date(birthdate));
        if (g === "too_young") { toast.error("Je moet minimaal 12 jaar zijn."); return; }
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/home", data: { display_name: name, birthdate } },
        });
        if (error) throw error;
        if (data.user && !data.user.identities?.length) {
          toast.error("Dit e-mailadres heeft al een account. Log in (bijvoorbeeld met Google) of kies 'Wachtwoord vergeten'.", { duration: 9000 });
          setMode("in");
          return;
        }
        setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: "/home" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Er ging iets mis");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    try {
      // Supabase stuurt je naar Google en daarna terug naar /auth; de useEffect hierboven gaat dan door naar de app.
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + "/auth" } });
      if (error) toast.error("Inloggen met Google lukte niet");
    } catch {
      toast.error("Inloggen met Google lukte niet. Probeer het opnieuw.");
    }
  }

  // Bevestigingsmail een tweede keer sturen, bijvoorbeeld als hij zoek is.
  async function resendAgain() {
    const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: window.location.origin + "/home" } });
    toast[error ? "error" : "success"](error ? "Opnieuw sturen lukte niet" : "Bevestigingsmail opnieuw gestuurd — check ook je spam-map");
  }

  return (
    <div className="mx-auto min-h-screen max-w-md px-6 py-10">
      <img src="/cerita-logo.png" alt="CeritaProject" className="size-24 rounded-3xl" />
      <h1 className="mt-8 text-4xl text-foreground">{mode === "in" ? "Welkom terug" : mode === "up" ? "Maak je account" : mode === "forgot" ? "Wachtwoord vergeten" : "Bevestig je e-mail"}</h1>
      {sent ? (
        <div className="mt-8 space-y-3 rounded-3xl bg-secondary p-6 text-secondary-foreground">
          <p>{mode === "forgot" ? "Check je e-mail. Klik op de link om een nieuw wachtwoord te kiezen." : "Check je e-mail en klik op de link om je account te bevestigen. Niet gezien? Kijk ook in je spam-map."}</p>
          {mode !== "forgot" && <button onClick={resendAgain} className="text-sm font-semibold underline">Opnieuw sturen</button>}
        </div>
      ) : (
        <>
          <Button variant="outline" className="mt-8 h-12 w-full rounded-full" onClick={google}>
            Doorgaan met Google
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">Met Google ben je meteen binnen — je krijgt geen bevestigingsmail.</p>
          <div className="my-6 text-center text-xs text-muted-foreground">of met e-mail</div>
          <form onSubmit={submit} className="space-y-4">
            {mode === "up" && (
              <>
                <div><Label htmlFor="n">Naam (mag een bijnaam zijn)</Label><Input id="n" required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-12 rounded-2xl" /></div>
                <div><Label htmlFor="b">Geboortedatum</Label><Input id="b" type="date" required value={birthdate} onChange={(e) => setBirthdate(e.target.value)} className="mt-1 h-12 rounded-2xl" /></div>
              </>
            )}
            <div><Label htmlFor="e">E-mail</Label><Input id="e" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 h-12 rounded-2xl" /></div>
            {mode !== "forgot" && mode !== "resend" && (
              <div><Label htmlFor="p">Wachtwoord</Label><Input id="p" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 h-12 rounded-2xl" /></div>
            )}
            <Button disabled={busy} className="h-12 w-full rounded-full">{mode === "in" ? "Inloggen" : mode === "up" ? "Account maken" : mode === "forgot" ? "Stuur herstel-link" : "Stuur bevestigingsmail"}</Button>
          </form>
          {mode === "in" && (
            <div className="mt-4 space-y-2">
              <button onClick={() => setMode("forgot")} className="w-full text-center text-sm text-muted-foreground underline">Wachtwoord vergeten?</button>
              <button onClick={() => setMode("resend")} className="w-full text-center text-sm text-muted-foreground underline">Bevestigingsmail niet ontvangen?</button>
            </div>
          )}
          <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-6 w-full text-center text-sm text-primary underline">
            {mode === "in" ? "Nog geen account? Aanmelden" : "Al een account? Inloggen"}
          </button>
          <p className="mt-8 text-center text-xs text-muted-foreground">Inloggen met telefoonnummer komt binnenkort.</p>
        </>
      )}
    </div>
  );
}
