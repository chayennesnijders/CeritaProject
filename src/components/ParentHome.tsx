import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, Phone, Shuffle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Riti } from "@/components/Riti";
import { ThemeDayCard } from "@/components/ThemeDayCard";
import { TesterCard } from "@/components/TesterCard";
import { celebrate } from "@/lib/celebrate";
import { MOODS, dutchHour, greeting, moodById, type MoodId } from "@/lib/home";
import {
  nextQuestion,
  PARENT_HELP,
  PARENT_MOOD_REPLY,
  parentDay,
  telHref,
  todayProgress,
  weekDots,
} from "@/lib/parent";
import { GUIDES, needsCheckIn, nextGuideFor } from "@/lib/guides";
import { bandInfo, bandsLabel, childQuestions, childTip } from "@/lib/child-age";
import { ChildAgePicker, useChildAges } from "@/components/ChildAgePicker";

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
  const { data: ages } = useChildAges(uid);
  const bands = ages?.bands ?? [];
  const tip = childTip(day, bands);
  const questions = childQuestions(bands);
  const [editAges, setEditAges] = useState(false);
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

  const [question, setQuestion] = useState(() => Math.abs(Date.parse(day) / 86_400_000) | 0);
  const q = questions[question % questions.length]!;

  const pct = Math.round((progress.done / progress.total) * 100);
  const [helpOpen, setHelpOpen] = useState(false);
  const goTo = (id: string, then?: () => void) => {
    then?.();
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const gridTiles: GridTile[] = [
    {
      label: "Voor jezelf",
      emoji: done("zelf") ? "✅" : "🌿",
      status: done("zelf") ? "Gedaan!" : "Opdracht van vandaag",
      tint: "bg-[#e3f1e8] dark:bg-[#1f3a2c]",
      attention: !done("zelf"),
      onClick: () => goTo("vandaag", () => setTab("zelf")),
    },
    {
      label: "Voor je kind",
      emoji: done("kind") ? "✅" : "💛",
      status: done("kind") ? "Gedaan!" : "Tip van vandaag",
      tint: "bg-[#fdf3d6] dark:bg-[#3d3420]",
      attention: !done("kind"),
      onClick: () => goTo("vandaag", () => setTab("kind")),
    },
    { label: "Vraag", emoji: "💬", status: "Om aan je kind te stellen", tint: "bg-[#fde4ea] dark:bg-[#4a2c35]", onClick: () => goTo("vraag") },
    ...(corner
      ? []
      : [
          {
            label: "Je gevoel",
            emoji: mood ? mood.emoji : "🙂",
            status: mood ? "Ingevuld" : "Hoe gaat het?",
            tint: "bg-[#ece6fb] dark:bg-[#2f2747]",
            attention: !mood,
            onClick: () => goTo("gevoel"),
          } satisfies GridTile,
          { label: "Dagboek", emoji: "📔", status: "Alleen voor jou", tint: "bg-[#f6ead9] dark:bg-[#3a2d26]", to: "/dagboek" } satisfies GridTile,
          { label: "Diertje", emoji: "🐾", status: "Verzorg het", tint: "bg-[#fde4ea] dark:bg-[#4a2c35]", to: "/diertje" } satisfies GridTile,
        ]),
    {
      label: "Handleiding",
      emoji: checkIn ? "💬" : "📘",
      status: checkIn ? "Hoe ging je plan?" : next?.status === "verder" ? `Verder (${next.pct}%)` : `${GUIDES.length} trainingen`,
      tint: "bg-[#e6eefb] dark:bg-[#22304a]",
      attention: !!checkIn,
      to: "/handleidingen",
    },
    { label: "Rust", emoji: "🫧", status: "2 minuten ademen", tint: "bg-[#e6eefb] dark:bg-[#22304a]", to: "/rust" },
    {
      label: "Hulp",
      emoji: "📞",
      status: "Bel met één tik",
      tint: "bg-[#fde4e4] dark:bg-[#4a2626]",
      onClick: () => goTo("hulp", () => setHelpOpen(true)),
    },
  ];
  const tileCls =
    "group relative flex flex-col items-center rounded-3xl px-1.5 py-3 text-center shadow-soft transition-transform active:scale-95";
  const chipCls =
    "shrink-0 rounded-full bg-card px-3.5 py-2 text-sm font-semibold shadow-soft transition-transform active:scale-95";
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

      {/* Everything you can do, at a glance. Tiles for today's parts scroll down to them. */}
      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Wat kun je doen?</h2>
        <div className="grid grid-cols-3 gap-2.5">
          {gridTiles.map((t) =>
            t.to ? (
              <Link key={t.label} to={t.to} className={`${tileCls} ${t.tint}`}>
                <GridTileBody t={t} />
              </Link>
            ) : (
              <button key={t.label} onClick={t.onClick} className={`${tileCls} ${t.tint}`}>
                <GridTileBody t={t} />
              </button>
            ),
          )}
        </div>
      </section>

      {/* Ask once for the age of the child(ren), so tips fit */}
      {ages?.installed && (!ages.set || editAges) && (
        <section className="space-y-3 rounded-3xl border-2 border-primary bg-card p-5 shadow-soft">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
              {editAges ? "Leeftijd aanpassen" : "Eén vraag aan jou"}
            </p>
            <h2 className="text-lg leading-snug">Hoe oud is je kind?</h2>
            <p className="text-sm text-muted-foreground">Dan passen je tips en vragen bij de leeftijd van je kind.</p>
          </div>
          <ChildAgePicker uid={uid} initial={bands} first={!ages.set} onDone={() => setEditAges(false)} />
          {editAges && (
            <button onClick={() => setEditAges(false)} className="w-full text-center text-xs text-muted-foreground underline">
              Annuleren
            </button>
          )}
        </section>
      )}

      <ThemeDayCard day={day} audience="ouders" />
      <TesterCard uid={uid} />

      {/* Assignment for yourself and tip for your child, one at a time */}
      <section id="vandaag" className="scroll-mt-20 overflow-hidden rounded-3xl bg-card shadow-soft">
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
            {tab === "zelf"
              ? "Jouw opdracht van vandaag"
              : tip.band
                ? `Tip voor je kind van ${bandInfo(tip.band).label} ${bandInfo(tip.band).emoji}`
                : "Tip voor je kind vandaag"}
          </p>
          <p className="mt-1 text-lg leading-snug">{tab === "zelf" ? today.self : tip.text}</p>
          <button
            onClick={() => void toggle(tab)}
            aria-pressed={done(tab)}
            className={`mt-4 w-full rounded-full px-4 py-2.5 text-sm font-semibold transition-transform active:scale-95 ${done(tab) ? "bg-[#2d6a4f] text-white" : "bg-primary text-primary-foreground"}`}
          >
            {done(tab) ? "✓ Gedaan (tik om terug te zetten)" : "Gedaan"}
          </button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Morgen om 00:00 staat er een nieuwe klaar.
            {tab === "kind" && ages?.installed && ages.set && !editAges && (
              <>
                {" "}
                <button onClick={() => setEditAges(true)} className="font-semibold text-primary underline">
                  {bands.length ? `Leeftijd: ${bandsLabel(bands)} ✏️` : "Leeftijd van je kind kiezen"}
                </button>
              </>
            )}
          </p>
        </div>
      </section>

      {/* A question to ask your child */}
      <section id="vraag" className="scroll-mt-20 space-y-3 rounded-3xl bg-secondary p-5 text-secondary-foreground shadow-soft">
        <p className="text-[11px] font-bold uppercase tracking-wider">
          {q.together ? "🧸 Samen doen" : "💬 Vraag het je kind eens"}
          {q.band && bands.length > 1 ? ` · ${bandInfo(q.band).label}` : ""}
        </p>
        <p key={question} className="animate-in fade-in text-lg font-semibold leading-snug">
          {q.together ? q.text : `“${q.text}”`}
        </p>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs opacity-80">
            {q.together
              ? "Een paar minuten samen spelen is al genoeg."
              : "Tip: stel de vraag terloops, bijvoorbeeld in de auto of tijdens het eten."}
          </p>
          <button
            onClick={() => setQuestion((i) => nextQuestion(i % questions.length, Math.random, questions.length))}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-foreground active:scale-95"
          >
            <Shuffle className="size-3.5" /> {q.together ? "Iets anders" : "Andere vraag"}
          </button>
        </div>
      </section>

      {/* Your mood */}
      {!corner && (
        <section id="gevoel" className="scroll-mt-20 rounded-3xl bg-card p-4 shadow-soft">
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

      {/* The rest, small */}
      {!corner && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Ook voor jou</h2>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <Link to="/dankbaar" className={chipCls}>🫙 Dankbaar potje</Link>
            <Link to="/stemming" className={chipCls}>📅 Mijn stemmingen</Link>
            <Link to="/brieven" className={chipCls}>💌 Brief aan jezelf</Link>
          </div>
        </section>
      )}

      {/* Help, folded in */}
      <details
        id="hulp"
        open={helpOpen}
        onToggle={(e) => setHelpOpen(e.currentTarget.open)}
        className="group scroll-mt-20 rounded-3xl bg-card p-4 shadow-soft"
      >
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

type GridTile = {
  label: string;
  emoji: string;
  status: string;
  tint: string;
  attention?: boolean;
  to?: string;
  onClick?: () => void;
};

function GridTileBody({ t }: { t: GridTile }) {
  return (
    <>
      {t.attention && <span aria-hidden className="absolute right-2 top-2 size-2.5 rounded-full bg-primary ring-2 ring-background" />}
      <span className="text-3xl transition-transform group-hover:-rotate-6 group-hover:scale-110">{t.emoji}</span>
      <span className="mt-1 w-full truncate text-sm font-semibold">{t.label}</span>
      <span className="w-full truncate text-[11px] leading-tight text-muted-foreground">{t.status}</span>
    </>
  );
}
