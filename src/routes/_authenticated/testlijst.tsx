import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { celebrate } from "@/lib/celebrate";
import { useActsAsParent } from "@/lib/parent-view";
import { testPhases, testProgress, testQuestions, type TesterRole } from "@/lib/test-checklist";
import { useMyTesterRow } from "@/lib/use-tester";

export const Route = createFileRoute("/_authenticated/testlijst")({
  head: () => ({ meta: [{ title: "Testlijst — CeritaProject" }] }),
  component: TestListPage,
});

/** The checklist for testers. The admins follow everyone's progress live in Beheer → Testers. */
function TestListPage() {
  const { data: me } = useMe();
  const uid = me?.user.id;
  const asParent = useActsAsParent();
  const role: TesterRole = asParent ? "ouder" : "jongere";
  const { data, isLoading } = useMyTesterRow(uid);
  const qc = useQueryClient();

  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<"bewaard" | "bezig" | null>(null);
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current || !data) return;
    loaded.current = true;
    setChecks(data.row?.checks ?? {});
    setNotes(data.row?.notes ?? {});
  }, [data]);

  const progress = testProgress(role, checks);
  const wasDone = useRef<boolean | null>(null);
  useEffect(() => {
    if (!loaded.current) return;
    const done = progress.done === progress.total;
    if (wasDone.current === false && done) celebrate("groot", { set: "hartjes" });
    wasDone.current = done;
  }, [progress.done, progress.total]);

  async function store(nextChecks: Record<string, boolean>, nextNotes: Record<string, string>) {
    if (!uid) return;
    setSaved("bezig");
    const { error } = await supabase.from("tester_progress").upsert({
      user_id: uid,
      role,
      checks: nextChecks,
      notes: nextNotes,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      setSaved(null);
      toast.error("Opslaan lukte niet. Probeer het zo nog eens.");
      return;
    }
    setSaved("bewaard");
    void qc.invalidateQueries({ queryKey: ["tester-progress", uid] });
  }

  function toggle(id: string) {
    const next = { ...checks, [id]: !checks[id] };
    if (!next[id]) delete next[id];
    else celebrate("klein", { set: "hartjes" });
    setChecks(next);
    void store(next, notes);
  }

  // Answers are saved a moment after typing stops.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function write(id: string, value: string) {
    const next = { ...notes, [id]: value.slice(0, 2000) };
    setNotes(next);
    setSaved("bezig");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void store(checks, next), 800);
  }
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  if (isLoading || !uid) return <p className="pt-6 text-sm text-muted-foreground">Laden…</p>;
  if (data && !data.installed)
    return (
      <p className="mt-6 rounded-3xl bg-card p-5 text-sm shadow-soft">
        De testlijst staat nog niet klaar. Probeer het later nog eens.
      </p>
    );

  const complete = progress.done === progress.total;
  return (
    <div className="space-y-4 pt-2">
      <header className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
          🧪 Testlijst · {role === "ouder" ? "voor ouders" : "voor jongeren"} · 2 weken
        </p>
        <h1 className="text-3xl leading-tight">Jouw testlijst</h1>
        <p className="text-sm text-muted-foreground">
          Fijn dat je meetest! Vink af wat je gedaan hebt. Alles wordt meteen bewaard, dus je kunt steeds terugkomen.
        </p>
        <p className="rounded-2xl bg-secondary p-3 text-xs text-secondary-foreground">
          👀 De makers van CeritaProject zien wat je hier afvinkt en schrijft, zodat ze de app kunnen verbeteren. Schrijf
          hier dus niets wat je liever privé houdt.
        </p>
      </header>

      <div className="sticky top-[3.75rem] z-10 -mx-1 space-y-1.5 rounded-2xl bg-background/95 px-1 py-2 backdrop-blur">
        <div className="flex items-baseline justify-between text-sm font-semibold">
          <span>{complete ? "Helemaal klaar 🎉" : progress.done === 0 ? "Nog niets afgevinkt" : "Goed bezig"}</span>
          <span className="tabular-nums text-muted-foreground">
            {progress.done} / {progress.total}
            {saved && <span className="ml-2 text-xs">{saved === "bezig" ? "…" : "✓ bewaard"}</span>}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all duration-500 ${complete ? "bg-[#2d6a4f]" : "bg-primary"}`}
            style={{ width: `${progress.pct}%` }}
          />
        </div>
      </div>

      {testPhases(role).map((phase) => {
        const p = progress.phases.find((x) => x.id === phase.id)!;
        return (
          <section key={phase.id} className="space-y-3 rounded-3xl bg-card p-4 shadow-soft">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-lg">{phase.title}</h2>
              <span className={`text-xs font-bold ${p.done === p.total ? "text-[#2d6a4f]" : "text-muted-foreground"}`}>
                {p.done === p.total ? "✓ Klaar" : `${p.done} van ${p.total}`}
              </span>
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">{phase.when}</p>
            <div className="space-y-2">
              {phase.items.map((item) => {
                const on = !!checks[item.id];
                return (
                  <button
                    key={item.id}
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggle(item.id)}
                    className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.99] ${on ? "border-transparent bg-[#e5f4e4] dark:bg-[#1f3a2c]" : ""}`}
                  >
                    <span
                      className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg border-2 text-sm font-bold ${on ? "border-[#2d6a4f] bg-[#2d6a4f] text-white" : "border-muted-foreground"}`}
                    >
                      {on ? "✓" : ""}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-sm font-semibold ${on ? "text-muted-foreground" : ""}`}>{item.title}</span>
                      <span className="block text-xs text-muted-foreground">{item.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      <section className="space-y-3 rounded-3xl bg-card p-4 shadow-soft">
        <h2 className="text-lg">Na twee weken: jouw mening</h2>
        <p className="-mt-2 text-xs text-muted-foreground">Kort mag. Je kunt het ook stukje bij beetje invullen.</p>
        {testQuestions(role).map((q) => (
          <label key={q.id} className="block space-y-1">
            <span className="text-sm font-semibold">{q.question}</span>
            <textarea
              id={`test-${q.id}`}
              value={notes[q.id] ?? ""}
              onChange={(e) => write(q.id, e.target.value)}
              placeholder={q.placeholder}
              rows={3}
              className="w-full rounded-2xl border bg-background p-3 text-sm"
            />
          </label>
        ))}
        <p className="text-xs text-muted-foreground">Je antwoorden worden vanzelf bewaard en komen meteen bij de makers aan.</p>
      </section>
    </div>
  );
}
