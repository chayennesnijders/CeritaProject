import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LegalLinks } from "@/components/LegalPage";
import { Riti } from "@/components/Riti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  contactReady,
  isEmail,
  SENDER_TYPES,
  senderType,
  type SenderType,
} from "@/lib/contact-form";
import { ORG } from "@/lib/legal";

export const Route = createFileRoute("/contact-ons")({
  validateSearch: (s: Record<string, unknown>): { soort?: SenderType } =>
    s["soort"] ? { soort: senderType(s["soort"]) } : {},
  head: () => ({
    meta: [
      { title: "Contact — CeritaProject" },
      {
        name: "description",
        content: "Stuur CeritaProject een vraag, als ouder, organisatie of jongere.",
      },
    ],
  }),
  component: ContactUsPage,
});

/** Public contact form (no account needed), for parents, organisations and anyone else. */
function ContactUsPage() {
  const { soort } = Route.useSearch();
  const [type, setType] = useState<SenderType>(soort ?? "ouder");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [body, setBody] = useState("");
  const [trap, setTrap] = useState(""); // hidden field: only bots fill it in
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = contactReady({ name, email, body, trap });

  async function send() {
    if (!ready) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from("public_messages").insert({
      sender_type: type,
      name: name.trim(),
      email: email.trim(),
      organisation: type === "organisatie" && organisation.trim() ? organisation.trim() : null,
      body: body.trim(),
    });
    setBusy(false);
    if (err)
      setError(`Versturen lukte niet. Probeer het later opnieuw, of mail naar ${ORG.email}.`);
    else setSent(true);
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background px-5 py-8">
      <button onClick={() => window.history.back()} className="text-sm text-primary underline">
        ← Terug
      </button>
      <div className="mt-4 flex items-center gap-2">
        <Riti size={100} expression={sent ? "blij" : "neutraal"} />
        <div className="relative flex-1 rounded-2xl bg-card p-3 text-sm shadow-soft">
          <span
            aria-hidden
            className="absolute -left-1.5 top-1/2 size-3 -translate-y-1/2 rotate-45 bg-card"
          />
          {sent
            ? "Dankjewel! We hebben je bericht ontvangen en antwoorden zo snel mogelijk per e-mail. 💛"
            : "Heeft u een vraag over CeritaProject? Stuur ons een bericht, we antwoorden per e-mail."}
        </div>
      </div>
      <h1 className="mt-4 text-3xl">Contact</h1>

      {sent ? (
        <p className="mt-4 rounded-3xl bg-card p-5 text-sm shadow-soft">
          ✅ Verstuurd. Geen antwoord binnen een paar dagen? Kijk ook even in je spam-map, of mail
          naar{" "}
          <a href={`mailto:${ORG.email}`} className="text-primary underline">
            {ORG.email}
          </a>
          .
        </p>
      ) : (
        <section className="mt-4 space-y-4 rounded-3xl bg-card p-5 shadow-soft">
          <div className="space-y-1.5">
            <p className="text-sm font-semibold">Wie bent u?</p>
            <div className="grid grid-cols-2 gap-2">
              {SENDER_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`rounded-2xl p-3 text-left text-sm font-semibold ${type === t.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  <span className="mr-1">{t.emoji}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Naam</span>
            <Input
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
              className="h-12 rounded-2xl"
            />
          </label>
          {type === "organisatie" && (
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">Organisatie</span>
              <Input
                value={organisation}
                maxLength={150}
                onChange={(e) => setOrganisation(e.target.value)}
                className="h-12 rounded-2xl"
              />
            </label>
          )}
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">
              E-mailadres (hier sturen we ons antwoord naartoe)
            </span>
            <Input
              type="email"
              inputMode="email"
              value={email}
              maxLength={200}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-2xl"
            />
            {email && !isEmail(email) && (
              <span className="text-xs text-destructive">Dit lijkt geen e-mailadres.</span>
            )}
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Uw vraag of bericht</span>
            <Textarea
              value={body}
              maxLength={3000}
              rows={6}
              onChange={(e) => setBody(e.target.value)}
              className="rounded-2xl"
            />
          </label>
          {/* Spam trap: invisible for people, bots fill it in. */}
          <input
            value={trap}
            onChange={(e) => setTrap(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            className="absolute -left-[9999px] h-0 w-0 opacity-0"
            name="website"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button disabled={!ready || busy} onClick={send} className="h-12 w-full rounded-full">
            {busy ? "Versturen…" : "💌 Versturen"}
          </Button>
          <p className="text-xs text-muted-foreground">
            We gebruiken uw naam en e-mailadres alleen om uw vraag te beantwoorden. Liever mailen?{" "}
            {ORG.email}
          </p>
        </section>
      )}
      <LegalLinks className="mt-8" />
    </div>
  );
}
