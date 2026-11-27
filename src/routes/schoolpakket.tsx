import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Riti } from "@/components/Riti";
import { Button } from "@/components/ui/button";
import { SCHOOL_LINKS, SCHOOL_QUESTIONS, SCHOOL_RULES, SCHOOL_SHEET, SCHOOL_STEPS, SCHOOL_WHO, schoolLetter } from "@/lib/school-pack";

/**
 * "CeritaProject op school": young people use this pack to introduce CeritaProject to their own school.
 * Public (no login), so a link can be sent to school and it prints cleanly (or saves as PDF).
 * The names typed into the letter stay in the browser; nothing is saved.
 */
export const Route = createFileRoute("/schoolpakket")({
  head: () => ({
    meta: [
      { title: "CeritaProject op school — schoolpakket" },
      { name: "description", content: "Zo vraag je je school om CeritaProject en de mentorlessen: een brief, uitleg en antwoorden op vragen van school." },
    ],
  }),
  component: SchoolPackPage,
});

const card = "rounded-3xl bg-card p-5 shadow-soft print:shadow-none print:border print:border-[#1E1615]/20";

function SchoolPackPage() {
  const [to, setTo] = useState("");
  const [from, setFrom] = useState("");
  const letter = schoolLetter(to, from);
  async function copy() {
    try {
      await navigator.clipboard.writeText(letter);
      toast.success("Brief gekopieerd. Plak hem in je mail of Magister.");
    } catch {
      toast.error("Kopiëren lukte niet. Selecteer de tekst en kopieer hem zelf.");
    }
  }
  return (
    <div className="min-h-screen bg-background print:bg-white">
      <style>{`@page { size: A4; margin: 14mm; } @media print { html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
      <main className="mx-auto max-w-2xl space-y-5 px-4 pb-8 pt-[calc(env(safe-area-inset-top,0px)+1rem)] print:max-w-none print:py-0">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? window.history.back() : window.location.assign("/profiel"))}
          className="inline-flex items-center gap-1 rounded-full bg-muted px-4 py-2 text-sm font-semibold active:scale-95 print:hidden"
        >
          ← Terug
        </button>
        <header className="flex items-start gap-4">
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">Schoolpakket</p>
            <h1 className="text-3xl leading-tight sm:text-4xl">CeritaProject op jouw school?</h1>
            <p className="mt-2 text-muted-foreground">
              Met dit pakket vraag je je school om de mentorlessen van CeritaProject. Je hoeft niks te weten of te kunnen: alles staat
              hieronder klaar.
            </p>
          </div>
          <Riti size={96} expression="blij" wave className="shrink-0 print:hidden" />
        </header>

        <div className="flex flex-wrap gap-2 print:hidden">
          <Button className="rounded-full" onClick={() => window.print()}>🖨️ Printen of opslaan als PDF</Button>
          <a href="#uitleg" className="rounded-full border px-4 py-2 text-sm font-semibold">📄 Naar de uitleg voor school</a>
        </div>

        <section className={card}>
          <h2 className="text-xl">Zo pak je het aan</h2>
          <ol className="mt-3 space-y-3">
            {SCHOOL_STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">{i + 1}</span>
                <span>
                  <b>{s.title}</b>
                  <span className="block text-sm text-muted-foreground">{s.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className={card}>
          <h2 className="text-xl">Met wie praat je?</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-3">
            {SCHOOL_WHO.map((w) => (
              <li key={w.who} className="rounded-2xl bg-muted p-3 text-sm">
                <span className="text-2xl">{w.emoji}</span>
                <b className="mt-1 block">{w.who}</b>
                <span className="text-muted-foreground">{w.why}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={card}>
          <h2 className="text-xl">De brief aan je school</h2>
          <p className="mt-1 text-sm text-muted-foreground print:hidden">Vul de namen in. Ze blijven alleen op jouw scherm, we bewaren niks.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 print:hidden">
            <label className="text-sm font-semibold">
              Aan wie?
              <input value={to} onChange={(e) => setTo(e.target.value)} maxLength={60} placeholder="bijv. meneer De Vries"
                className="mt-1 w-full rounded-2xl border bg-background px-3 py-2 font-normal" />
            </label>
            <label className="text-sm font-semibold">
              Jouw naam
              <input value={from} onChange={(e) => setFrom(e.target.value)} maxLength={60} placeholder="je voornaam"
                className="mt-1 w-full rounded-2xl border bg-background px-3 py-2 font-normal" />
            </label>
          </div>
          <pre className="mt-3 whitespace-pre-wrap rounded-2xl bg-muted p-4 font-sans text-sm leading-relaxed">{letter}</pre>
          <Button variant="outline" className="mt-3 rounded-full print:hidden" onClick={() => void copy()}>📋 Brief kopiëren</Button>
        </section>

        <section className={card}>
          <h2 className="text-xl">Wat school misschien vraagt</h2>
          <div className="mt-3 space-y-2">
            {SCHOOL_QUESTIONS.map((q) => (
              <details key={q.q} className="rounded-2xl bg-muted p-3 print:[&>p]:block" open>
                <summary className="cursor-pointer font-semibold">{q.q}</summary>
                <p className="mt-1 text-sm">{q.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={`${card} bg-secondary`}>
          <h2 className="text-xl">Spelregels voor jou</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {SCHOOL_RULES.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </section>

        <section id="uitleg" className="break-before-page scroll-mt-4 rounded-[28px] border-4 border-[#1E1615] bg-[#FDF8F2] p-6 text-[#1E1615] shadow-[10px_10px_0_#1E1615] print:shadow-none">
          <p className="font-display text-lg font-bold">Cerita<span className="text-[#E58AA9]">Project</span></p>
          <h2 className="mt-2 text-3xl leading-tight">{SCHOOL_SHEET.title}</h2>
          <p className="mt-2 font-semibold">{SCHOOL_SHEET.intro}</p>
          <ul className="mt-4 space-y-2.5">
            {SCHOOL_SHEET.points.map(([emoji, text]) => (
              <li key={text} className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-[#1E1615] bg-[#F2A6BF]">{emoji}</span>
                <span className="pt-1">{text}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 rounded-2xl bg-[#F2A6BF] p-4">
            <p className="font-bold">Bekijk de lessen en neem contact op</p>
            <p className="break-all text-sm">{SCHOOL_LINKS.lessons}</p>
            <p className="break-all text-sm">{SCHOOL_LINKS.contact}</p>
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground print:hidden">
          Vragen? <Link to="/contact-ons" className="underline">Neem contact op</Link> · <Link to="/lessen" className="underline">De lessen</Link> ·{" "}
          <Link to="/privacy" className="underline">Privacy</Link>
        </p>
      </main>
    </div>
  );
}
