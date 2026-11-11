import { Riti } from "@/components/Riti";
import { LegalLinks } from "@/components/LegalPage";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ageGroupFor } from "@/lib/auth";
import { readOAuthReturn } from "@/lib/oauth-return";
import { friendlyAuthError, passwordProgress } from "@/lib/auth-messages";
import type { RitiExpression } from "@/lib/riti";
import { ArrowLeft, Calendar, ChevronDown, Eye, EyeOff, Lock, Mail, User } from "lucide-react";

// The address as it was when the page opened (before anything can tidy it up), so tokens or an
// error that Supabase sent back (for example from a mail link) are never lost.
const openedAt = typeof window === "undefined" ? "" : window.location.href;

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  // Young people (13–27) or a parent/carer: parents get their own environment and no birthdate.
  // Teachers come from /lessen (?rol=leraar); only then is "Ik ben leraar" offered.
  const [teacherInvite] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("rol") === "leraar",
  );
  const [who, setWho] = useState<"jongere" | "ouder" | "leraar">(teacherInvite ? "leraar" : "jongere");
  // A teacher coming from /lessen usually has no account yet, so start on "aanmelden".
  const [mode, setMode] = useState<"in" | "up" | "forgot" | "resend">(teacherInvite ? "up" : "in");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [focus, setFocus] = useState<"email" | "password" | null>(null);
  const go = (m: typeof mode) => {
    setMode(m);
    setError(null);
    setSent(false);
  };

  // Terug van een inlog-link (of al ingelogd)? Dan meteen door naar de app,
  // in plaats van opnieuw het e-mailformulier te tonen.
  useEffect(() => {
    let done = false;
    const go = () => { if (!done) { done = true; nav({ to: "/home" }); } };
    const back = readOAuthReturn(openedAt || window.location.href);
    const clean = () => window.history.replaceState(null, "", window.location.pathname);
    if (back.kind === "error") {
      toast.error(back.message, { duration: 15000 });
      clean();
    } else if (back.kind === "tokens") {
      void supabase.auth
        .setSession({ access_token: back.accessToken, refresh_token: back.refreshToken })
        .then(({ data, error }) => {
          clean();
          if (error) toast.error(`Inloggen lukte niet: ${error.message}`, { duration: 15000 });
          else if (data.session) go();
        });
    } else if (back.kind === "code") {
      void supabase.auth.exchangeCodeForSession(back.code).then(async ({ data, error }) => {
        clean();
        if (data.session) return go();
        // Supabase may already have used the code itself: then there is a session and all is well.
        const { data: now } = await supabase.auth.getSession();
        if (now.session) go();
        else if (error) toast.error(`Inloggen lukte niet: ${error.message}`, { duration: 15000 });
      });
    }
    supabase.auth.getSession().then(({ data }) => { if (data.session) go(); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) go();
    });
    return () => sub.subscription.unsubscribe();
  }, [nav]);


  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
        const parent = who === "ouder";
        const teacher = who === "leraar";
        if (!parent && !teacher && ageGroupFor(new Date(birthdate)) === "too_young") { setError("CeritaProject is voor jongeren vanaf 13 jaar. Ben je jonger? Praat met de Kindertelefoon: 0800-0432."); return; }
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin + "/home",
            // A parent signs up without a birthdate; after confirming the e-mail the app turns the account
            // into a parent account (become_parent), see BirthdateGate.
            // A teacher too; they enter their school code next (become_teacher).
            data: parent
              ? { display_name: name, wants_parent: true }
              : teacher
                ? { display_name: name, wants_teacher: true }
                : { display_name: name, birthdate },
          },
        });
        if (error) throw error;
        if (data.user && !data.user.identities?.length) {
          setMode("in");
          setError("Dit e-mailadres heeft al een account. Log hieronder in, of kies ‘Wachtwoord vergeten?’.");
          return;
        }
        setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: "/home" });
      }
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : ""));
    } finally {
      setBusy(false);
    }
  }

  // Bevestigingsmail een tweede keer sturen, bijvoorbeeld als hij zoek is.
  async function resendAgain() {
    const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: window.location.origin + "/home" } });
    toast[error ? "error" : "success"](error ? "Opnieuw sturen lukte niet" : "Bevestigingsmail opnieuw gestuurd — check ook je spam-map");
  }

  // Riti talks along: what she says and how she looks follows what you are doing.
  const riti: { face: RitiExpression; say: string } = error
    ? { face: "verdrietig", say: "Oei, dat ging niet goed. Lees even wat er staat 👇" }
    : sent
      ? { face: "trots", say: mode === "forgot" ? "Check je mail, de link staat klaar 💌" : "Bijna klaar! Check je mail 💌" }
      : busy
        ? { face: "denkend", say: "Even geduld…" }
        : focus === "password"
          ? { face: "troostend", say: "Ik kijk niet hoor 🙈" }
          : mode === "up"
            ? { face: "blij", say: who === "leraar" ? "Fijn dat je er bent! 🎓" : who === "ouder" ? "Fijn dat je er bent als ouder 💛" : "Leuk dat je erbij komt! 🎉" }
            : mode === "forgot"
              ? { face: "troostend", say: "Geen zorgen, dat overkomt iedereen." }
              : mode === "resend"
                ? { face: "denkend", say: "Ik stuur de mail nog een keer." }
                : { face: "blij", say: "Fijn dat je er weer bent! 💛" };
  const pw = passwordProgress(password);
  const field = "relative mt-1 flex items-center";
  const icon = "pointer-events-none absolute left-4 size-4 text-muted-foreground";
  const inputCls = "h-12 rounded-2xl pl-11";

  return (
    <div className="mx-auto min-h-screen max-w-md px-6 py-8">
      <div className="flex items-end gap-2">
        <Riti size={110} expression={riti.face} wave={!busy && !error} />
        <p
          key={riti.say}
          className="relative mb-6 animate-in fade-in rounded-2xl rounded-bl-sm bg-card px-4 py-2.5 text-sm font-semibold shadow-soft"
          aria-live="polite"
        >
          {riti.say}
        </p>
      </div>

      {(mode === "in" || mode === "up") && !sent ? (
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-muted p-1" role="tablist" aria-label="Inloggen of account maken">
          {([["in", "Inloggen"], ["up", "Account maken"]] as const).map(([m, label]) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => go(m)}
              className={`rounded-full py-2.5 text-sm font-semibold transition ${mode === m ? "bg-card shadow-soft" : "text-muted-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : (
        <button onClick={() => go("in")} className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-primary">
          <ArrowLeft className="size-4" /> Terug naar inloggen
        </button>
      )}

      <h1 className="mt-6 text-3xl text-foreground">
        {mode === "in" ? "Welkom terug" : mode === "up" ? "Maak je account" : mode === "forgot" ? "Wachtwoord vergeten" : "Bevestigingsmail opnieuw"}
      </h1>
      {mode === "forgot" && !sent && (
        <p className="mt-1 text-sm text-muted-foreground">Vul je e-mail in. Je krijgt een link om een nieuw wachtwoord te kiezen.</p>
      )}
      {mode === "resend" && !sent && (
        <p className="mt-1 text-sm text-muted-foreground">Vul je e-mail in. We sturen de bevestigingsmail nog een keer.</p>
      )}

      {sent ? (
        <div className="mt-6 space-y-3 rounded-3xl bg-secondary p-6 text-secondary-foreground">
          <p className="text-3xl">💌</p>
          <p>
            {mode === "forgot"
              ? "Check je e-mail. Klik op de link om een nieuw wachtwoord te kiezen."
              : "Check je e-mail en klik op de link om je account te bevestigen."}
          </p>
          <p className="text-sm">Niet gezien? Kijk ook in je spam- of reclamemap.</p>
          {mode !== "forgot" && <button onClick={resendAgain} className="text-sm font-semibold underline">Opnieuw sturen</button>}
        </div>
      ) : (
        <>
          <form onSubmit={submit} className="mt-5 space-y-4">
            {mode === "up" && (
              <>
                <div role="radiogroup" aria-label="Wie ben jij?" className="grid grid-cols-2 gap-2">
                  {([
                    ["jongere", "🙋 Ik ben jongere", "13 tot 27 jaar"],
                    ["ouder", "👪 Ik ben ouder", "of verzorger"],
                    ...(teacherInvite ? ([["leraar", "🎓 Ik ben leraar", "met een schoolcode"]] as const) : []),
                  ] as const).map(([id, label, sub]) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={who === id}
                      onClick={() => setWho(id)}
                      className={`rounded-2xl border-2 p-3 text-left transition active:scale-95 ${who === id ? "border-primary bg-primary/10" : "border-input"}`}
                    >
                      <span className="block text-sm font-semibold">{label}</span>
                      <span className="block text-xs text-muted-foreground">{sub}</span>
                    </button>
                  ))}
                </div>
                {who === "leraar" && (
                  <p className="animate-in fade-in rounded-2xl bg-secondary p-3 text-xs text-secondary-foreground">
                    Je krijgt een leraar-account met de lessen van CeritaProject. Na het aanmelden vul je de schoolcode
                    in. Je ziet niets van de jongeren in de app.
                  </p>
                )}
                {who === "ouder" && (
                  <p className="animate-in fade-in rounded-2xl bg-secondary p-3 text-xs text-secondary-foreground">
                    Je krijgt een eigen omgeving voor ouders, met elke dag een tip voor jou en je kind en handleidingen
                    voor lastige gesprekken. Je ziet nooit iets van jongeren, ook niet van je eigen kind. Ben je zelf
                    tussen de 13 en 27? Kies dan ‘jongere’: je kunt de ouderhoek later aanzetten.
                  </p>
                )}
                <div>
                  <Label htmlFor="n">Naam (mag een bijnaam zijn)</Label>
                  <div className={field}>
                    <User className={icon} />
                    <Input id="n" required autoComplete="nickname" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Na het aanmelden kies je ook een eigen @gebruikersnaam.</p>
                </div>
                {who === "jongere" && (
                  <div>
                    <Label htmlFor="b">Geboortedatum</Label>
                    <div className={field}>
                      <Calendar className={icon} />
                      <Input id="b" type="date" required value={birthdate} onChange={(e) => setBirthdate(e.target.value)} className={inputCls} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Zo kom je bij leeftijdsgenoten. Anderen zien je geboortedatum niet.</p>
                  </div>
                )}
              </>
            )}
            <div>
              <Label htmlFor="e">E-mail</Label>
              <div className={field}>
                <Mail className={icon} />
                <Input
                  id="e"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onFocus={() => setFocus("email")}
                  onBlur={() => setFocus(null)}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
            {mode !== "forgot" && mode !== "resend" && (
              <div>
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="p">Wachtwoord</Label>
                  {mode === "in" && (
                    <button type="button" onClick={() => go("forgot")} className="text-xs font-semibold text-primary">
                      Wachtwoord vergeten?
                    </button>
                  )}
                </div>
                <div className={field}>
                  <Lock className={icon} />
                  <Input
                    id="p"
                    type={showPw ? "text" : "password"}
                    minLength={8}
                    required
                    autoComplete={mode === "up" ? "new-password" : "current-password"}
                    value={password}
                    onFocus={() => setFocus("password")}
                    onBlur={() => setFocus(null)}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputCls} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Wachtwoord verbergen" : "Wachtwoord laten zien"}
                    className="absolute right-2 grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                  >
                    {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {mode === "up" && password.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className={`block h-full rounded-full transition-all ${pw.ok ? "bg-[#2d6a4f]" : "bg-primary"}`}
                        style={{ width: `${pw.pct}%` }}
                      />
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {pw.ok ? "✓ Lang genoeg" : `Nog ${pw.left} ${pw.left === 1 ? "teken" : "tekens"}`}
                    </span>
                  </div>
                )}
              </div>
            )}
            {error && (
              <p role="alert" className="animate-in fade-in rounded-2xl bg-destructive/10 p-3 text-sm text-foreground">
                ⚠️ {error}
              </p>
            )}
            <Button disabled={busy} className="h-12 w-full rounded-full text-base">
              {busy ? "Even geduld…" : mode === "in" ? "Inloggen" : mode === "up" ? "Account maken" : mode === "forgot" ? "Stuur herstel-link" : "Stuur bevestigingsmail"}
            </Button>
          </form>

          {mode === "in" && (
            <details className="group mt-5 rounded-2xl bg-card p-3 shadow-soft">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
                Hulp bij inloggen
                <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-2 space-y-1 text-sm">
                <button onClick={() => go("forgot")} className="block w-full rounded-xl px-2 py-2 text-left hover:bg-muted">
                  🔑 Ik ben mijn wachtwoord vergeten
                </button>
                <button onClick={() => go("resend")} className="block w-full rounded-xl px-2 py-2 text-left hover:bg-muted">
                  💌 Ik heb de bevestigingsmail niet gekregen
                </button>
                <Link to="/hulp" className="block w-full rounded-xl px-2 py-2 text-left hover:bg-muted">
                  🆘 Ik heb nu hulp nodig
                </Link>
              </div>
            </details>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Door verder te gaan ga je akkoord met de <Link to="/huisregels" className="underline">huisregels</Link>, de{" "}
            <Link to="/privacy" className="underline">privacyverklaring</Link> en de{" "}
            <Link to="/voorwaarden" className="underline">voorwaarden</Link>.
          </p>
          <LegalLinks className="mt-4 text-muted-foreground" />
        </>
      )}
    </div>
  );
}
