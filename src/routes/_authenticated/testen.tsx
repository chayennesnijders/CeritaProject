import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMyTesterRow } from "@/lib/use-tester";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { celebrate } from "@/lib/celebrate";
import { TEST_CHECKLIST, TEST_ITEM_COUNT, TEST_QUESTIONS, feedbackMessage } from "@/lib/test-week";
import { Riti } from "@/components/Riti";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/testen")({
  head: () => ({ meta: [{ title: "Testweek — CeritaProject" }] }),
  component: TestPage,
});

const PHONES = ["Android", "iPhone"];

/**
 * Test week: tick off the checklist and answer the closing questions. Everything is saved right away
 * in tester_progress, so the admins follow it live in Beheer → Testers; the answers are also sent
 * as one message at the end. Ticks from before (kept only on the phone) are carried over once.
 */
function TestPage() {
  const { data: me } = useMe();
  const uid = me?.user.id;
  const key = uid ? `cerita-testweek-${uid}` : null;
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [phone, setPhone] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [why, setWhy] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const qc = useQueryClient();
  const { data: server } = useMyTesterRow(uid);

  type Notes = Record<string, string>;
  const notesNow = (over: Partial<{ phone: string; score: number | null; why: string; answers: Record<string, string>; sent: boolean }> = {}): Notes => {
    const a = { phone, score, why, answers, sent, ...over };
    return {
      ...a.answers,
      ...(a.phone ? { telefoon: a.phone } : {}),
      ...(a.score !== null ? { cijfer: String(a.score) } : {}),
      ...(a.why.trim() ? { waarom: a.why } : {}),
      ...(a.sent ? { verstuurd: "ja" } : {}),
    };
  };
  async function store(checks: Record<string, boolean>, notes: Notes) {
    if (!uid) return;
    const clean = Object.fromEntries(Object.entries(checks).filter(([, v]) => v));
    await supabase.from("tester_progress").upsert({
      user_id: uid,
      role: "jongere",
      checks: clean,
      notes,
      updated_at: new Date().toISOString(),
    });
    void qc.invalidateQueries({ queryKey: ["tester-progress", uid] });
  }

  // First load: the saved list wins, plus any ticks that were only kept on this phone before.
  const loaded = useRef(false);
  useEffect(() => {
    if (!key || !server || loaded.current) return;
    loaded.current = true;
    let local: Record<string, boolean> = {};
    try {
      local = JSON.parse(localStorage.getItem(key) ?? "{}") as Record<string, boolean>;
    } catch {
      /* nothing on this phone */
    }
    const remote = (server.row?.checks ?? {}) as Record<string, boolean>;
    const merged = { ...remote, ...Object.fromEntries(Object.entries(local).filter(([, v]) => v)) };
    setDone(merged);
    const n = (server.row?.notes ?? {}) as Notes;
    const { telefoon, cijfer, waarom, verstuurd, ...rest } = n;
    if (telefoon) setPhone(telefoon);
    if (cijfer) setScore(Number(cijfer));
    if (waarom) setWhy(waarom);
    if (verstuurd) setSent(true);
    setAnswers(rest);
    const newTicks = Object.keys(merged).some((id) => merged[id] && !remote[id]);
    if (server.installed && newTicks) void store(merged, n);
  }, [key, server]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(id: string) {
    const next = { ...done, [id]: !done[id] };
    setDone(next);
    try {
      if (key) localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* not remembered */
    }
    const count = Object.values(next).filter(Boolean).length;
    if (next[id] && count === TEST_ITEM_COUNT) celebrate("groot");
    void store(next, notesNow());
  }

  // Answers are saved a moment after typing stops, so the admins see them as they come in.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function saveAnswersSoon(over: Parameters<typeof notesNow>[0]) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void store(done, notesNow(over)), 800);
  }
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const count = Object.values(done).filter(Boolean).length;

  async function send() {
    if (!uid) return;
    setBusy(true);
    const { error } = await supabase.from("admin_messages").insert({
      user_id: uid,
      topic: "iets-anders",
      body: feedbackMessage({ phone, score, why, answers }, count),
    });
    setBusy(false);
    if (error) {
      toast.error("Versturen lukte niet. Probeer het later opnieuw.");
      return;
    }
    setSent(true);
    void store(done, notesNow({ sent: true }));
    celebrate("groot", { set: "hartjes" });
  }

  return (
    <div className="space-y-5 pt-2">
      <div className="flex items-center gap-2">
        <Riti size={84} expression="blij" />
        <div>
          <h1 className="text-3xl">Testweek 🧪</h1>
          <p className="text-sm text-muted-foreground">Dankjewel dat je de app test! 💗</p>
        </div>
      </div>

      <section className="space-y-2 rounded-3xl bg-card p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="text-lg">1. Probeer alles uit</h2>
          <span className="text-sm font-semibold">
            {count}/{TEST_ITEM_COUNT}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(count / TEST_ITEM_COUNT) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Vink af wat je hebt gedaan. Alles wordt meteen bewaard, en de makers van de app zien wat je
          afvinkt en schrijft. Tik op → om er meteen heen te gaan. Werkt iets niet of is iets
          raar? Maak een screenshot en{" "}
          <Link to="/contact" className="font-semibold text-primary underline">
            stuur het naar ons
          </Link>
          .
        </p>
        {TEST_CHECKLIST.map((g) => (
          <div key={g.title} className="pt-2">
            <p className="mb-1 text-sm font-semibold">{g.title}</p>
            <div className="space-y-1">
              {g.items.map((i) => (
                <div
                  key={i.id}
                  className="flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-sm"
                >
                  <input
                    id={`t-${i.id}`}
                    type="checkbox"
                    checked={!!done[i.id]}
                    onChange={() => toggle(i.id)}
                    className="size-5 shrink-0 accent-[var(--primary)]"
                  />
                  <label
                    htmlFor={`t-${i.id}`}
                    className={`min-w-0 flex-1 ${done[i.id] ? "text-muted-foreground line-through" : ""}`}
                  >
                    {i.text}
                  </label>
                  {i.to && (
                    <Link to={i.to} aria-label="Ga erheen" className="shrink-0 px-1 text-primary">
                      →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3 rounded-3xl bg-card p-4 shadow-soft">
        <h2 className="text-lg">2. Na een week: jouw mening</h2>
        {sent ? (
          <p className="rounded-2xl bg-secondary p-3 text-sm text-secondary-foreground">
            Dankjewel! 💗 Je antwoorden zijn verstuurd. Hier maken we de app beter mee.
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold">Wat voor telefoon heb je?</p>
              <div className="flex gap-2">
                {PHONES.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setPhone(p);
                      saveAnswersSoon({ phone: p });
                    }}
                    className={`flex-1 rounded-full py-2 text-sm font-semibold ${phone === p ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            {TEST_QUESTIONS.map((q) => (
              <label key={q.id} className="block space-y-1.5">
                <span className="text-sm font-semibold">{q.label}</span>
                <Textarea
                  id={`q-${q.id}`}
                  rows={2}
                  maxLength={400}
                  value={answers[q.id] ?? ""}
                  onChange={(e) => {
                    const next = { ...answers, [q.id]: e.target.value };
                    setAnswers(next);
                    saveAnswersSoon({ answers: next });
                  }}
                  className="rounded-2xl"
                />
              </label>
            ))}
            <div className="space-y-1.5">
              <p className="text-sm font-semibold">
                Hoe groot is de kans dat je de app blijft gebruiken? (1–10)
              </p>
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      setScore(n);
                      saveAnswersSoon({ score: n });
                    }}
                    className={`rounded-xl py-2 text-sm font-semibold ${score === n ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <Textarea
                id="q-why"
                rows={2}
                maxLength={300}
                value={why}
                onChange={(e) => {
                  setWhy(e.target.value);
                  saveAnswersSoon({ why: e.target.value });
                }}
                placeholder="Waarom dit cijfer?"
                className="rounded-2xl"
              />
            </div>
            <Button
              disabled={busy || score === null}
              onClick={send}
              className="h-12 w-full rounded-full"
            >
              {busy ? "Versturen…" : "Verstuur mijn antwoorden 💗"}
            </Button>
          </>
        )}
      </section>
    </div>
  );
}
