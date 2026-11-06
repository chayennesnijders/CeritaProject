import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Download, Lock } from "lucide-react";
import { Riti } from "@/components/Riti";
import { LegalLinks } from "@/components/LegalPage";
import { Button } from "@/components/ui/button";
import { lessonCatalog, lessonDownload } from "@/lib/lessons.functions";
import { normalizeCode } from "@/lib/lessons";

export const Route = createFileRoute("/lessen")({
  head: () => ({
    meta: [
      { title: "Lessen voor mentoren — CeritaProject" },
      {
        name: "description",
        content: "Kant-en-klare mentorlessen over welzijn: dia's, handleiding en werkbladen. Je geeft ze zelf, zonder voorbereiding van uren.",
      },
      { property: "og:title", content: "Lessen voor mentoren — CeritaProject" },
      { property: "og:image", content: "https://app.ceritaproject.nl/icon-512.png" },
    ],
  }),
  component: LessonsPage,
});

const CODE_KEY = "cerita-schoolcode";

/** Teachers' corner: no account; a school code unlocks the lessons of the licence. */
function LessonsPage() {
  const catalog = useServerFn(lessonCatalog);
  const download = useServerFn(lessonDownload);
  const [code, setCode] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [busyFile, setBusyFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CODE_KEY);
      if (saved) setCode(saved);
    } catch {
      // No storage: the code is simply asked again next time.
    }
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["lessons", code],
    queryFn: () => catalog({ data: code ? { code } : {} }),
  });
  // A code that turned out not to work is forgotten again.
  useEffect(() => {
    if (data?.codeProblem) {
      try {
        localStorage.removeItem(CODE_KEY);
      } catch {
        // ignore
      }
    }
  }, [data?.codeProblem]);

  function applyCode() {
    const norm = normalizeCode(typed);
    if (!norm) {
      setError("Een schoolcode heeft 8 tekens, bijvoorbeeld KX7P-2M9Q.");
      return;
    }
    setError(null);
    try {
      localStorage.setItem(CODE_KEY, norm);
    } catch {
      // ignore
    }
    setCode(norm);
  }

  async function get(fileId: string) {
    setBusyFile(fileId);
    setError(null);
    try {
      const { url } = await download({ data: { fileId, ...(code ? { code } : {}) } });
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Downloaden lukte niet.");
    } finally {
      setBusyFile(null);
    }
  }

  const unlockedAll = !!data?.school;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 py-8">
        <div className="flex items-center gap-3">
          <Riti size={100} expression="blij" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">CeritaProject voor scholen</p>
            <h1 className="text-3xl leading-tight sm:text-4xl">Lessen voor mentoren</h1>
          </div>
        </div>
        <p className="mt-4 max-w-prose text-muted-foreground">
          Kant-en-klare mentorlessen over welzijn, met echte verhalen van jongeren. Elke les heeft dia's met
          aantekeningen, een handleiding en een werkblad. Je geeft de les zelf; niemand hoeft iets over zichzelf
          te delen.
        </p>

        <section className="mt-6 rounded-3xl bg-card p-5 shadow-soft">
          {unlockedAll ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-2xl">🏫</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{data?.school}</p>
                <p className="text-sm text-muted-foreground">
                  Alle lessen staan voor je klaar{data?.validUntil ? ` (tot en met ${new Date(data.validUntil).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })})` : ""}.
                </p>
              </div>
              <button
                onClick={() => {
                  try {
                    localStorage.removeItem(CODE_KEY);
                  } catch {
                    // ignore
                  }
                  setCode(null);
                  setTyped("");
                }}
                className="text-xs text-muted-foreground underline"
              >
                Andere code
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                applyCode();
              }}
              className="space-y-2"
            >
              <label htmlFor="schoolcode" className="font-semibold">Heeft je school een code?</label>
              <div className="flex gap-2">
                <input
                  id="schoolcode"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder="Bijv. KX7P-2M9Q"
                  autoComplete="off"
                  className="h-11 min-w-0 flex-1 rounded-2xl border border-input bg-background px-3 uppercase tracking-wider"
                />
                <Button type="submit" className="h-11 rounded-full">Openen</Button>
              </div>
              {(error || data?.codeProblem) && <p className="text-sm text-destructive">{error ?? data?.codeProblem}</p>}
              <p className="text-xs text-muted-foreground">
                Geen code? De proefles kun je gratis downloaden. Een schoollicentie aanvragen kan via{" "}
                <Link to="/contact-ons" className="font-semibold underline">het contactformulier</Link>.
              </p>
            </form>
          )}
        </section>

        {unlockedAll && error && <p className="mt-3 text-sm text-destructive">{error}</p>}

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          {isLoading && <p className="text-sm text-muted-foreground">Lessen laden…</p>}
          {isError && <p className="text-sm text-muted-foreground">De lessen laden lukte even niet. Probeer het later nog eens.</p>}
          {data && data.lessons.length === 0 && (
            <p className="text-sm text-muted-foreground">De eerste lessen komen er binnenkort aan.</p>
          )}
          {data?.lessons.map((l) => (
            <article key={l.id} className="flex flex-col gap-3 rounded-3xl bg-card p-5 shadow-soft">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{l.emoji}</span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg leading-snug">{l.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    {[l.audience, `${l.minutes} min`, l.theme].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {l.isFree && (
                  <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                    Gratis proefles
                  </span>
                )}
              </div>
              {l.summary && <p className="text-sm">{l.summary}</p>}
              <div className="mt-auto flex flex-col gap-2">
                {l.unlocked ? (
                  l.files.length ? (
                    l.files.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => void get(f.id)}
                        disabled={busyFile === f.id}
                        className="flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-left text-sm font-semibold transition-colors hover:bg-secondary disabled:opacity-60"
                      >
                        <Download className="size-4 shrink-0" />
                        <span className="flex-1">{f.label}</span>
                        {busyFile === f.id && <span className="text-xs text-muted-foreground">bezig…</span>}
                      </button>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">De bestanden komen er binnenkort bij.</p>
                  )
                ) : (
                  <p className="flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                    <Lock className="size-4 shrink-0" /> Met een schoolcode te downloaden
                  </p>
                )}
              </div>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-3xl bg-secondary p-5 text-sm text-secondary-foreground">
          <p className="font-semibold">Zorg goed voor je klas</p>
          <p className="mt-1">
            Laat de zorgcoördinator weten wanneer je een les geeft. Vertelt een leerling iets zorgelijks, volg dan het
            protocol van je school. Hulplijnen voor jongeren: Kindertelefoon 0800-0432 en 113 Zelfmoordpreventie
            0800-0113.
          </p>
        </section>

        <LegalLinks className="mt-8" />
      </div>
    </div>
  );
}
