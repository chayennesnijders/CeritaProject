import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, Phone, Shuffle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Riti } from "@/components/Riti";
import { ThemeDayCard } from "@/components/ThemeDayCard";
import { celebrate } from "@/lib/celebrate";
import { MOODS, dutchHour, greeting, moodById, type MoodId } from "@/lib/home";
import {
  nextQuestion,
  PARENT_HELP,
  PARENT_MOOD_REPLY,
  PARENT_QUESTIONS,
  parentDay,
  telHref,
  todayProgress,
  weekDots,
} from "@/lib/parent";
import { GUIDES, needsCheckIn, nextGuideFor } from "@/lib/guides";

type CheckKind = "zelf" | "kind";

/**
 * Home screen for parents and carers (and the parents' corner for young parents): today's progress,
 * one card with an assignment for yourself and a tip for your child, a question to ask your child,
 * your mood, the next guide, quick links and help numbers you can call with one tap.
 */
export function ParentHome({
  uid,
  day,
  name,
  corner = false,
}: {
  uid: string;
  day: string;
  name: string;
  corner?: boolean;
}) {
  const qc = useQueryClient();
  const hi = greeting(dutchHour());
  const today = parentDay(day);
  const weekAgo = new Date(new Date(day).getTime() - 6 * 86_400_000).toISOString().slice(0, 10);

  const { data: guideRows = [] } = useQuery({
    queryKey: ["guide-progress", uid],
    queryFn: async () =>
      (
        await supabase
          .from("guide_progress")
          .select("guide, step, plan, completed_at, reflection")
          .eq("user_id", uid)
      ).data ?? [],
  });
  const checkIn = GUIDES.find((g) => {
    const r = guideRows.find((x) => x.guide === g.slug);
    return r ? needsCheckIn(r, Date.now()) : false;
  });
  const next = nextGuideFor(guideRows);

  const { data } = useQuery({
    queryKey: ["parent-home", uid, day],
    queryFn: async () => {
      const [checks, mood] = await Promise.all([
        supabase.from("parent_checks").select("day, kind").eq("user_id", uid).gte("day", weekAgo),
        supabase.from("mood_entries").select("mood").eq("user_id", uid).eq("day", day).maybeSingle(),
      ]);
      return { checks: checks.data ?? [], mood: (mood.data?.mood as MoodId | undefined) ?? null };
    },
  });
  const done = (kind: CheckKind) => !!data?.checks.some((c) => c.day === day && c.kind === kind);
  const refresh = () => qc.invalidateQueries({ queryKey: ["parent-home", uid, day] });
  const progress = todayProgress({
    self: done("zelf"),
    child: done("kind"),
    mood: corner ? undefined : !!data?.mood,
  });
  const week = weekDots(day, (data?.checks ?? []).map((c) => c.day));
  const weekCount = week.filter((d) => d.done).length;

  // Celebrate once when everything for today is done.
  const wasComplete = useRef<boolean | null>(null);
  const complete = !!data && progress.done === progress.total;
  useEffect(() => {
    if (!data) return;
    if (wasComplete.current === false && complete) celebrate("groot", { set: "hartjes" });
    wasComplete.current = complete;
  }, [complete, data]);

  const [tab, setTab] = useState<CheckKind>("zelf");
  async function toggle(kind: CheckKind) {
    const wasDone = done(kind);
    const { error } = wasDone
      ? await supabase.from("parent_checks").delete().eq("user_id", uid).eq("day", day).eq("kind", kind)
      : await supabase.from("parent_checks").insert({ user_id: uid, day, kind });
    if (error) {
      toast.error("Opslaan lukte niet. Heb je update-49 al in Supabase gedraaid?");
      return;
    }
    if (!wasDone) {
      celebrate("klein", { set: "hartjes" });
      // Done with this one: show the other one if that is still open.
      const other: CheckKind = kind === "zelf" ? "kind" : "zelf";
      if (!done(other)) setTimeout(() => setTab(other), 500);
    }
    void refresh();
  }
  async function setMood(id: MoodId) {
    const { error } = await supabase.from("mood_entries").upsert({ user_id: uid, day, mood: id });
    if (error) {
      toast.error("Opslaan lukte niet.");
      return;
    }
    void refresh();
  }
  const mood = moodById(data?.mood ?? null);
  const reply = mood ? PARENT_MOOD_REPLY[mood.id] : null;

  const [question, setQuestion] = useState(() => (Math.abs(Date.parse(day) / 86_400_000) | 0) % PARENT_QUESTIONS.length);

  const pct = Math.round((progress.done / progress.total) * 100);
  const guideLink: string = checkIn || !next ? "/handleidingen" : `/handleidingen/${next.guide.slug}`;

  return (
    <div className="space-y-4 pt-2">
      {/* Greeting and today's progress */}
      <section className="space-y-3 rounded-3xl bg-ink p-5 text-ink-foreground shadow-soft">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">
            {corner ? "Jouw ouderhoek" : "CeritaProject voor ouders"}
          </p>
          <h1 className="text-2xl leading-tight">
            {corner ? "Voor jou als ouder 💛" : `${hi.text}${name ? `, ${name}` : ""} ${hi.emoji}`}
          </h1>
        </div>
        <div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold">Vandaag</span>
            <span className="opacity-80">
              {complete ? "Alles gedaan 🎉" : `${progress.done} van ${progress.total} gedaan`}
            </span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-ink-foreground/20">
            <div className="h-full rounded-full bg-secondary transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
            <Chip on={done("zelf")} label="🌿 Voor jezelf" />
            <Chip on={done("kind")} label="💛 Voor je kind" />
            {!corner && <Chip on={!!data?.mood} label="🙂 Je gevoel" />}
          </div>
        </div>
        <div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
            {week.map((d) => (
              <div key={d.day} className="space-y-0.5">
                <span className={`block ${d.today ? "font-bold" : "opacity-70"}`}>{d.label}</span>
                <span
                  className={`mx-auto grid size-7 place-items-center rounded-full text-sm ${d.done ? "bg-secondary" : d.today ? "ring-2 ring-secondary" : d.future ? "opacity-30" : "bg-ink-foreground/10"}`}
                  aria-label={`${d.label}${d.done ? ": gedaan" : ""}`}
                >
                  {d.done ? "💛" : ""}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-center text-[11px] opacity-80">
            {weekCount === 0
              ? "Elke dag een klein stapje. Begin hieronder."
              : `${weekCount} ${weekCount === 1 ? "dag" : "dagen"} deze week. Wat goed van je.`}
          </p>
        </div>
      </section>

      <ThemeDayCard day={day} audience="ouders" />

      {/* Assignment for yourself and tip for your child, one at a time */}
      <section className="overflow-hidden rounded-3xl bg-card shadow-soft">
        <div className="grid grid-cols-2 gap-1 bg-muted p-1" role="tablist">
          {(["zelf", "kind"] as const).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`rounded-2xl px-2 py-2 text-sm font-semibold transition ${tab === k ? "bg-card shadow-soft" : "text-muted-foreground"}`}
            >
              {k === "zelf" ? "🌿 Voor jezelf" : "💛 Voor je kind"} {done(k) ? "✓" : ""}
            </button>
          ))}
        </div>
        <div key={tab} className={`animate-in fade-in p-5 transition-colors duration-300 ${done(tab) ? "bg-[#e5f4e4] dark:bg-[#1f3a2c]" : ""}`}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
            {tab === "zelf" ? "Jouw opdracht van vandaag" : "Tip voor je kind vandaag"}
          </p>
          <p className="mt-1 text-lg leading-snug">{tab === "zelf" ? today.self : today.child}</p>
          <button
            onClick={() => void toggle(tab)}
            aria-pressed={done(tab)}
            className={`mt-4 w-full rounded-full px-4 py-2.5 text-sm font-semibold transition-transform active:scale-95 ${done(tab) ? "bg-[#2d6a4f] text-white" : "bg-primary text-primary-foreground"}`}
          >
            {done(tab) ? "✓ Gedaan (tik om terug te zetten)" : "Gedaan"}
          </button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">Morgen om 00:00 staat er een nieuwe klaar.</p>
        </div>
      </section>

      {/* A question to ask your child */}
      <section className="space-y-3 rounded-3xl bg-secondary p-5 text-secondary-foreground shadow-soft">
        <p className="text-[11px] font-bold uppercase tracking-wider">💬 Vraag het je kind eens</p>
        <p key={question} className="animate-in fade-in text-lg font-semibold leading-snug">
          “{PARENT_QUESTIONS[question]}”
        </p>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs opacity-80">Tip: stel de vraag terloops, bijvoorbeeld in de auto of tijdens het eten.</p>
          <button
            onClick={() => setQuestion((q) => nextQuestion(q))}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-foreground active:scale-95"
          >
            <Shuffle className="size-3.5" /> Andere vraag
          </button>
        </div>
      </section>

      {/* Your mood */}
      {!corner && (
        <section className="rounded-3xl bg-card p-4 shadow-soft">
          <div className="flex items-center gap-2">
            <Riti size={56} expression={mood ? "blij" : "neutraal"} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Hoe voel jij je vandaag?</p>
              <p className="text-xs text-muted-foreground">Alleen jij ziet je antwoord.</p>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-5 gap-1">
            {MOODS.map((m) => (
              <button
                key={m.id}
                onClick={() => void setMood(m.id)}
                aria-pressed={data?.mood === m.id}
                className={`flex flex-col items-center rounded-2xl py-2 transition-transform active:scale-90 ${data?.mood === m.id ? "scale-105 bg-secondary" : "hover:bg-muted"}`}
              >
                <span className="text-2xl">{m.emoji}</span>
                <span className="mt-1 text-[11px] font-semibold">{m.label}</span>
              </button>
            ))}
          </div>
          {reply && (
            <div key={mood?.id} className="mt-3 animate-in fade-in rounded-2xl bg-muted p-3 text-sm">
              <p>{reply.text}</p>
              <Link to={reply.to} className="mt-1 inline-block text-xs font-semibold text-primary">
                {reply.link} →
              </Link>
            </div>
          )}
        </section>
      )}

      {/* The next guide */}
      {(checkIn || next) && (
        <Link
          to={guideLink}
          className={`block space-y-2 rounded-3xl bg-card p-4 shadow-soft transition active:scale-[0.99] ${checkIn ? "border-2 border-primary" : ""}`}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">{checkIn ? "💬" : next!.guide.emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-primary">
                {checkIn ? "Hoe ging het met je plan?" : next!.status === "verder" ? "Ga verder waar je was" : "Handleiding voor jou"}
              </span>
              <span className="block font-semibold leading-snug">{checkIn ? checkIn.title : next!.guide.title}</span>
              <span className="block text-xs text-muted-foreground">
                {checkIn ? "Vertel het in één tik en krijg advies dat erbij past." : `±${next!.guide.minutes} min · ${next!.guide.steps.length} korte stappen`}
              </span>
            </span>
            <span className="text-primary">→</span>
          </div>
          {!checkIn && next!.status === "verder" && (
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${next!.pct}%` }} />
            </div>
          )}
        </Link>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Tile to="/handleidingen" emoji="📘" title="Handleidingen" sub={`${GUIDES.length} trainingen`} />
        <Tile to="/rust" emoji="🫧" title="Rustmoment" sub="2 minuten ademen" />
        {!corner && <Tile to="/dankbaar" emoji="🫙" title="Dankbaar potje" sub="Wat ging er goed?" />}
        {!corner && <Tile to="/stemming" emoji="📅" title="Stemming" sub="Jouw kalender" />}
      </div>

      {/* Help, folded in */}
      <details className="group rounded-3xl bg-card p-4 shadow-soft">
        <summary className="flex cursor-pointer list-none items-center gap-3">
          <span className="text-2xl">📞</span>
          <span className="flex-1">
            <span className="block font-semibold">Hulp voor jou als ouder</span>
            <span className="block text-xs text-muted-foreground">Bel met één tik. Bij direct gevaar: 112.</span>
          </span>
          <ChevronDown className="size-5 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-3 space-y-2">
          {PARENT_HELP.map((h) => (
            <div key={h.name} className="flex items-center gap-3 rounded-2xl bg-muted p-3">
              <span className="min-w-0 flex-1 text-sm">
                <b>{h.name}</b>
                <span className="block text-xs text-muted-foreground">{h.what}</span>
              </span>
              {h.phone && (
                <a
                  href={telHref(h.phone)}
                  className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                >
                  <Phone className="size-3.5" /> {h.phone}
                </a>
              )}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

function Chip({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 transition-colors ${on ? "bg-secondary text-secondary-foreground" : "bg-ink-foreground/15"}`}>
      {on ? "✓ " : ""}
      {label}
    </span>
  );
}

function Tile({ to, emoji, title, sub }: { to: string; emoji: string; title: string; sub: string }) {
  return (
    <Link to={to} className="rounded-3xl bg-card p-4 text-center shadow-soft transition-transform active:scale-95">
      <span className="block text-2xl">{emoji}</span>
      <span className="block text-sm font-semibold">{title}</span>
      <span className="block text-[11px] text-muted-foreground">{sub}</span>
    </Link>
  );
}
