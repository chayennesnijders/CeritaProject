import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { celebrate } from "@/lib/celebrate";
import {
  answeredCount,
  feedbackMessage,
  allAnswered,
  joinMulti,
  openQuestions,
  splitMulti,
  TEST_FORM,
  type TestFormAnswers,
} from "@/lib/test-week";
import { useMyTesterRow } from "@/lib/use-tester";
import { Riti } from "@/components/Riti";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/testen")({
  head: () => ({ meta: [{ title: "Testvragen — CeritaProject" }] }),
  component: TestPage,
});

/**
 * Test questions for young testers: answer today and send. Every answer is saved right away in
 * tester_progress (the admins follow it live in Beheer → Testers) and sent as one message on Send.
 */
function TestPage() {
  const { data: me } = useMe();
  const uid = me?.user.id;
  const qc = useQueryClient();
  const { data: server } = useMyTesterRow(uid);
  const [answers, setAnswers] = useState<TestFormAnswers>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [showMissing, setShowMissing] = useState(false);

  // Start from what was saved before (also when the app was closed in between).
  const loaded = useRef(false);
  useEffect(() => {
    if (!server || loaded.current) return;
    loaded.current = true;
    const { verstuurd, ...rest } = (server.row?.notes ?? {}) as TestFormAnswers;
    setAnswers(rest);
    if (verstuurd) setSent(true);
  }, [server]);

  async function store(next: TestFormAnswers, isSent: boolean) {
    if (!uid) return;
    await supabase.from("tester_progress").upsert({
      user_id: uid,
      role: "jongere",
      checks: (server?.row?.checks ?? {}) as Record<string, boolean>,
      notes: { ...next, ...(isSent ? { verstuurd: "ja" } : {}) },
      updated_at: new Date().toISOString(),
    });
    void qc.invalidateQueries({ queryKey: ["tester-progress", uid] });
  }

  // Taps are saved at once; typing a moment after it stops.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function set(id: string, value: string, now = false) {
    const next = { ...answers, [id]: value };
    setAnswers(next);
    if (timer.current) clearTimeout(timer.current);
    if (now) void store(next, sent);
    else timer.current = setTimeout(() => void store(next, sent), 800);
  }
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function send() {
    if (!uid) return;
    const open = openQuestions(answers);
    if (open.length) {
      setShowMissing(true);
      document.getElementById(`vraag-${open[0]!.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast(`Nog ${open.length} ${open.length === 1 ? "vraag" : "vragen"} open. Beantwoord alles, dan kun je versturen.`);
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("admin_messages").insert({
      user_id: uid,
      topic: "iets-anders",
      body: feedbackMessage(answers),
    });
    setBusy(false);
    if (error) {
      toast.error("Versturen lukte niet. Probeer het later opnieuw.");
      return;
    }
    setSent(true);
    void store(answers, true);
    celebrate("groot", { set: "hartjes" });
  }

  const done = answeredCount(answers);
  const pct = Math.round((done / TEST_FORM.length) * 100);
  const chip = (on: boolean) =>
    `rounded-full px-3 py-2 text-sm font-semibold transition active:scale-95 ${on ? "bg-primary text-primary-foreground" : "bg-muted"}`;

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center gap-2">
        <Riti size={84} expression={sent ? "trots" : "blij"} />
        <div>
          <h1 className="text-3xl">Testvragen 🧪</h1>
          <p className="text-sm text-muted-foreground">Dankjewel dat je de app test! 💗 Duurt ongeveer 5 minuten.</p>
        </div>
      </div>

      <p className="rounded-2xl bg-secondary p-3 text-xs text-secondary-foreground">
        Je gebruikt de app al een tijdje: vertel eerlijk wat je ervan vindt. Beantwoord alle vragen; kort mag. Je
        antwoorden worden meteen bewaard, en de makers van de app lezen ze.
      </p>

      <div className="sticky top-[3.75rem] z-10 -mx-1 space-y-1.5 rounded-2xl bg-background/95 px-1 py-2 backdrop-blur">
        <div className="flex items-baseline justify-between text-sm font-semibold">
          <span>{sent ? "Verstuurd 💗" : done === TEST_FORM.length ? "Alles beantwoord ✓" : done === 0 ? "Begin waar je wilt" : "Goed bezig"}</span>
          <span className="tabular-nums text-muted-foreground">
            {done} / {TEST_FORM.length} beantwoord
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {sent ? (
        <section className="space-y-3 rounded-3xl bg-card p-5 text-center shadow-soft">
          <p className="text-4xl">💗</p>
          <h2 className="text-xl">Dankjewel, je antwoorden zijn verstuurd!</h2>
          <p className="text-sm text-muted-foreground">Hier maken we de app beter mee.</p>
          <button onClick={() => setSent(false)} className="text-sm font-semibold text-primary underline">
            Iets aanpassen of toevoegen
          </button>
        </section>
      ) : (
        <>
          {TEST_FORM.map((q, n) => (
            <section
              key={q.id}
              id={`vraag-${q.id}`}
              className={`space-y-2 rounded-3xl bg-card p-4 shadow-soft transition ${showMissing && !(answers[q.id] ?? "").trim() ? "ring-2 ring-destructive" : ""}`}
            >
              <p className="text-sm font-semibold">
                <span className="mr-1 text-muted-foreground tabular-nums">{n + 1}.</span>
                {q.label}
                {(answers[q.id] ?? "").trim() && <span className="ml-1 text-[#2d6a4f]">✓</span>}
              </p>
              {showMissing && !(answers[q.id] ?? "").trim() && (
                <p className="text-xs font-semibold text-destructive">Deze vraag moet nog beantwoord worden</p>
              )}
              {q.kind === "choice" && (
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={q.label}>
                  {q.options.map((o) => (
                    <button
                      key={o}
                      role="radio"
                      aria-checked={answers[q.id] === o}
                      onClick={() => set(q.id, answers[q.id] === o ? "" : o, true)}
                      className={chip(answers[q.id] === o)}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              )}
              {q.kind === "multi" && (
                <div className="flex flex-wrap gap-2">
                  {q.options.map((o) => {
                    const list = splitMulti(answers[q.id]);
                    const on = list.includes(o);
                    return (
                      <button
                        key={o}
                        role="checkbox"
                        aria-checked={on}
                        onClick={() =>
                          set(q.id, joinMulti(on ? list.filter((x) => x !== o) : [...list, o]), true)
                        }
                        className={chip(on)}
                      >
                        {on ? "✓ " : ""}
                        {o}
                      </button>
                    );
                  })}
                </div>
              )}
              {q.kind === "score" && (
                <div className="grid grid-cols-10 gap-1">
                  {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((v) => (
                    <button
                      key={v}
                      aria-pressed={answers[q.id] === v}
                      onClick={() => set(q.id, v, true)}
                      className={`rounded-xl py-2 text-sm font-semibold ${answers[q.id] === v ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}
              {q.kind === "text" && (
                <Textarea
                  id={`q-${q.id}`}
                  rows={2}
                  maxLength={400}
                  value={answers[q.id] ?? ""}
                  onChange={(e) => set(q.id, e.target.value)}
                  placeholder={q.placeholder}
                  className="rounded-2xl"
                />
              )}
            </section>
          ))}

          <Button
            disabled={busy}
            onClick={send}
            className={`h-12 w-full rounded-full ${allAnswered(answers) ? "" : "opacity-60"}`}
          >
            {busy ? "Versturen…" : "Verstuur mijn antwoorden 💗"}
          </Button>
          {!allAnswered(answers) && (
            <p className="-mt-2 text-center text-xs text-muted-foreground">
              Nog {openQuestions(answers).length} {openQuestions(answers).length === 1 ? "vraag" : "vragen"} open. Versturen
              kan als alles beantwoord is.
            </p>
          )}
        </>
      )}
    </div>
  );
}
