import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LegalLinks } from "@/components/LegalPage";
import { Riti } from "@/components/Riti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MIN_AGE,
  PARENT_AGE,
  WAITLIST_STORES,
  waitlistProblem,
  type WaitlistStore,
} from "@/lib/waitlist";

export const Route = createFileRoute("/wachtlijst")({
  validateSearch: (s: Record<string, unknown>): { bron?: string } =>
    typeof s["bron"] === "string" ? { bron: s["bron"].slice(0, 40) } : {},
  head: () => ({
    meta: [
      { title: "Wachtlijst — CeritaProject" },
      {
        name: "description",
        content:
          "Er komt een app aan: een veilige plek voor jongeren van 13 tot 27. Zet je op de wachtlijst.",
      },
      { property: "og:title", content: "Er komt een app aan 💗 — CeritaProject" },
      {
        property: "og:description",
        content: "Een veilige plek om je verhaal te delen. Zet je op de wachtlijst!",
      },
      { property: "og:image", content: "https://app.ceritaproject.nl/icon-512.png" },
    ],
  }),
  component: WaitlistPage,
});

const AGES = Array.from({ length: 27 - 12 + 1 }, (_, i) => i + 12); // 12 … 27, plus "28+"
const SHARE_URL = "https://app.ceritaproject.nl/wachtlijst?bron=vriend";

/** Public waiting list (no account needed): e-mail, age and which phone, to hear when the app is out. */
function WaitlistPage() {
  const { bron } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [store, setStore] = useState<WaitlistStore | null>(null);
  const [parentOk, setParentOk] = useState(false);
  const [privacyOk, setPrivacyOk] = useState(false);
  const [trap, setTrap] = useState(""); // hidden field: only bots fill it in
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    void supabase.rpc("waitlist_count").then(({ data }) => setCount(data ?? null));
  }, [done]);

  const problem = waitlistProblem({ email, age, store, parentOk, privacyOk });
  const tooYoung = age !== null && age < MIN_AGE;

  async function join() {
    if (problem || trap) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.rpc("join_waitlist", {
      _email: email.trim(),
      _age: age!,
      _store: store!,
      _parent_ok: parentOk,
      _source: bron ?? "",
    });
    setBusy(false);
    if (err) setError(err.message.includes("vanaf 13") ? problem : err.message);
    else setDone(true);
  }

  const [copied, setCopied] = useState(false);
  async function share() {
    const text = "Er komt een app aan voor jongeren: CeritaProject 💗 Zet je ook op de wachtlijst!";
    try {
      if (navigator.share) await navigator.share({ title: "CeritaProject", text, url: SHARE_URL });
      else {
        await navigator.clipboard.writeText(`${text} ${SHARE_URL}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      /* closed the share sheet */
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background px-5 py-8">
      <div className="flex items-center gap-2">
        <Riti size={110} expression={done ? "blij" : "neutraal"} wave={!done} />
        <div className="relative flex-1 rounded-2xl bg-card p-3 text-sm shadow-soft">
          <span
            aria-hidden
            className="absolute -left-1.5 top-1/2 size-3 -translate-y-1/2 rotate-45 bg-card"
          />
          {done
            ? "Joepie, je staat erop! Ik laat het je weten zodra de app er is. 🎉"
            : "Hoi! Ik ben Riti. Er komt een app aan, en ik wil jou als eerste laten weten wanneer hij er is."}
        </div>
      </div>

      <h1 className="mt-6 text-4xl">
        {done ? "Je staat op de wachtlijst 💗" : "Er komt een app aan 💗"}
      </h1>
      {count !== null && count >= 25 && (
        <p className="mt-2 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
          ✨ Al {count} jongeren staan op de wachtlijst
        </p>
      )}

      {done ? (
        <section className="mt-5 space-y-4">
          <div className="rounded-3xl bg-card p-5 text-sm shadow-soft">
            <p>
              We sturen je een mail op <strong>{email.trim()}</strong> zodra je de app kunt
              downloaden. {store === "play" && "De Android-versie komt als eerste! 🤖"}
            </p>
            <p className="mt-2 text-muted-foreground">
              Kijk dan ook even in je spam-map, voor de zekerheid.
            </p>
          </div>
          <div className="rounded-3xl bg-primary p-5 text-center text-primary-foreground shadow-soft">
            <p className="text-lg font-bold">Ken jij iemand die dit ook nodig heeft?</p>
            <p className="mt-1 text-sm opacity-90">
              Stuur de wachtlijst door aan een vriend(in). 🤍
            </p>
            <Button onClick={share} variant="secondary" className="mt-3 h-12 w-full rounded-full">
              {copied ? "Link gekopieerd ✓" : "Deel met een vriend(in)"}
            </Button>
          </div>
          <p className="text-center text-sm">
            Volg ons ook op TikTok:{" "}
            <a
              href="https://www.tiktok.com/@ceritaproject"
              className="font-semibold text-primary underline"
            >
              @ceritaproject
            </a>
          </p>
        </section>
      ) : (
        <>
          <ul className="mt-4 space-y-1.5 text-sm">
            <li>📖 Lees echte verhalen van jongeren die hetzelfde meemaken</li>
            <li>💬 Klets veilig met leeftijdsgenoten, in groepen per leeftijd</li>
            <li>🎓 Praat met een coach, of stel anoniem een vraag</li>
            <li>🌱 Je eigen dagboek, stemmingen en een diertje om voor te zorgen</li>
          </ul>

          <section className="mt-5 space-y-4 rounded-3xl bg-card p-5 shadow-soft">
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">Je e-mailadres</span>
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                maxLength={254}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jij@voorbeeld.nl"
                className="h-12 rounded-2xl"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">Hoe oud ben je?</span>
              <select
                value={age ?? ""}
                onChange={(e) => setAge(e.target.value ? Number(e.target.value) : null)}
                className="h-12 w-full rounded-2xl border border-input bg-background px-3"
              >
                <option value="">Kies je leeftijd</option>
                {AGES.map((a) => (
                  <option key={a} value={a}>
                    {a === 12 ? "12 of jonger" : `${a} jaar`}
                  </option>
                ))}
                <option value={28}>28 of ouder</option>
              </select>
            </label>
            {tooYoung && (
              <p className="rounded-2xl bg-secondary p-3 text-sm text-secondary-foreground">
                De app is vanaf 13 jaar. Kom terug als je 13 bent! 💛 Wil je nu met iemand praten?
                Bel gratis de Kindertelefoon: 0800-0432.
              </p>
            )}

            {!tooYoung && (
              <>
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold">Wat voor telefoon heb je?</p>
                  <div className="grid gap-2">
                    {WAITLIST_STORES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setStore(s.id)}
                        className={`rounded-2xl p-3 text-left text-sm font-semibold ${store === s.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                      >
                        <span className="mr-1.5">{s.emoji}</span>
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    De Android-versie komt als eerste, de iPhone-versie daarna.
                  </p>
                </div>

                {age !== null && age < PARENT_AGE && (
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={parentOk}
                      onChange={(e) => setParentOk(e.target.checked)}
                      className="mt-1 size-4"
                    />
                    <span>
                      Mijn ouder of verzorger weet dat ik me aanmeld en vindt het goed.{" "}
                      <Link to="/ouders" className="text-primary underline">
                        Info voor ouders
                      </Link>
                    </span>
                  </label>
                )}
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={privacyOk}
                    onChange={(e) => setPrivacyOk(e.target.checked)}
                    className="mt-1 size-4"
                  />
                  <span>
                    Ik vind het goed dat CeritaProject mij een mail stuurt als de app er is. Daarna
                    halen we mijn e-mailadres van de lijst.{" "}
                    <Link to="/privacy" className="text-primary underline">
                      Privacy
                    </Link>
                  </span>
                </label>

                <input
                  tabIndex={-1}
                  aria-hidden
                  autoComplete="off"
                  value={trap}
                  onChange={(e) => setTrap(e.target.value)}
                  className="absolute -left-[9999px] h-0 w-0 opacity-0"
                />
                {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
                <Button
                  disabled={busy}
                  onClick={join}
                  className="h-12 w-full rounded-full text-base"
                >
                  {busy ? "Even geduld…" : "Zet me op de wachtlijst 💗"}
                </Button>
              </>
            )}
          </section>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Heb je nu meteen hulp nodig? Bel 113 (0800-0113) of de Kindertelefoon (0800-0432).
          </p>
        </>
      )}
      <LegalLinks className="mt-8 text-muted-foreground" />
    </div>
  );
}
