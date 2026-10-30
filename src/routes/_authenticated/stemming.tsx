import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { challengeDay } from "@/lib/challenges";
import { MOODS, moodById, type MoodId } from "@/lib/home";
import { MOOD_COLORS, monthGrid, moodCounts, moodStreak } from "@/lib/mood-calendar";

export const Route = createFileRoute("/_authenticated/stemming")({
  head: () => ({
    meta: [
      { title: "Mijn stemming — CeritaProject" },
      { name: "description", content: "Je stemming per dag in een kalender. Alleen jij ziet dit." },
    ],
  }),
  component: MoodCalendarPage,
});

const MONTHS = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
];

/** Your daily mood as a colourful month calendar. Private: only you can see it. */
function MoodCalendarPage() {
  const { data: me } = useMe();
  const uid = me?.user.id;
  const today = challengeDay();
  const [ym, setYm] = useState(() => ({
    y: Number(today.slice(0, 4)),
    m: Number(today.slice(5, 7)),
  }));
  const { data: entries = [] } = useQuery({
    queryKey: ["moods", uid],
    enabled: !!uid,
    queryFn: async () =>
      (await supabase.from("mood_entries").select("day, mood").eq("user_id", uid!).order("day"))
        .data ?? [],
  });
  const byDay = new Map(entries.map((e) => [e.day, e.mood as MoodId]));
  const prefix = `${ym.y}-${String(ym.m).padStart(2, "0")}`;
  const counts = moodCounts(entries, prefix);
  const streak = moodStreak(
    entries.map((e) => e.day),
    today,
  );
  const shift = (d: number) =>
    setYm(({ y, m }) => {
      const n = y * 12 + (m - 1) + d;
      return { y: Math.floor(n / 12), m: (n % 12) + 1 };
    });
  const isFuture = prefix > today.slice(0, 7);

  return (
    <div className="space-y-4 pt-2">
      <div>
        <h1 className="text-3xl">📅 Mijn stemming</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Elke dag dat je op de homepagina je gevoel kiest, kleurt hier een vakje. Alleen jij ziet
          dit.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-3xl bg-card p-3 shadow-soft">
          <p className="text-2xl font-bold">🔥 {streak}</p>
          <p className="text-xs text-muted-foreground">{streak === 1 ? "dag" : "dagen"} op rij</p>
        </div>
        <div className="rounded-3xl bg-card p-3 shadow-soft">
          <p className="text-2xl font-bold">{entries.length}</p>
          <p className="text-xs text-muted-foreground">dagen ingevuld</p>
        </div>
      </div>

      <section className="rounded-3xl bg-card p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => shift(-1)}
            aria-label="Vorige maand"
            className="rounded-full p-2 active:bg-muted"
          >
            <ChevronLeft className="size-5" />
          </button>
          <p className="font-semibold">
            {MONTHS[ym.m - 1]} {ym.y}
          </p>
          <button
            onClick={() => shift(1)}
            disabled={prefix >= today.slice(0, 7)}
            aria-label="Volgende maand"
            className="rounded-full p-2 active:bg-muted disabled:opacity-30"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted-foreground">
          {["ma", "di", "wo", "do", "vr", "za", "zo"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="mt-1 space-y-1">
          {monthGrid(ym.y, ym.m).map((week, i) => (
            <div key={i} className="grid grid-cols-7 gap-1">
              {week.map((day, j) => {
                if (!day) return <span key={j} />;
                const mood = moodById(byDay.get(day));
                return (
                  <div
                    key={day}
                    title={mood ? mood.label : undefined}
                    className={`grid aspect-square place-items-center rounded-xl text-sm ${day === today ? "ring-2 ring-primary" : ""} ${mood ? "" : "bg-muted/60 text-muted-foreground"}`}
                    style={mood ? { background: MOOD_COLORS[mood.id] } : undefined}
                  >
                    {mood ? <span className="text-lg">{mood.emoji}</span> : Number(day.slice(8))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {!isFuture && counts.length === 0 && (
          <p className="mt-3 text-center text-sm text-muted-foreground">
            Deze maand nog niets ingevuld.
          </p>
        )}
      </section>

      {counts.length > 0 && (
        <section className="rounded-3xl bg-card p-4 shadow-soft">
          <p className="mb-2 font-semibold">Deze maand</p>
          <div className="space-y-2">
            {counts.map(({ mood, count }) => (
              <div key={mood.id} className="flex items-center gap-2 text-sm">
                <span className="w-8 text-xl">{mood.emoji}</span>
                <span className="w-20">{mood.label}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(count / Math.max(...counts.map((c) => c.count))) * 100}%`,
                      background: MOOD_COLORS[mood.id],
                    }}
                  />
                </div>
                <span className="w-6 text-right font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
        {MOODS.map((m) => (
          <span key={m.id} className="flex items-center gap-1">
            <span
              className="inline-block size-3 rounded-full"
              style={{ background: MOOD_COLORS[m.id] }}
            />{" "}
            {m.label}
          </span>
        ))}
      </div>
      <Link to="/home" className="block text-center text-sm text-primary underline">
        Vandaag invullen op de homepagina
      </Link>
    </div>
  );
}
