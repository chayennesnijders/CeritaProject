import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { challengeDay } from "@/lib/challenges";
import { GOAL_IDEAS, goalStreak, lastWeek, MAX_GOALS } from "@/lib/goals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/doelen")({
  head: () => ({
    meta: [
      { title: "Mijn doelen — CeritaProject" },
      { name: "description", content: "Kleine eigen doelen, met elke dag een vinkje." },
    ],
  }),
  component: GoalsPage,
});

const DAY_LETTERS = ["zo", "ma", "di", "wo", "do", "vr", "za"];

/** Small personal goals with a tick per day and a streak. Only you see them. */
function GoalsPage() {
  const { data: me } = useMe();
  const uid = me?.user.id;
  const qc = useQueryClient();
  const today = challengeDay();
  const week = lastWeek(today);
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("🎯");

  const { data: goals = [] } = useQuery({
    queryKey: ["goals", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data: g } = await supabase
        .from("goals")
        .select("id, title, emoji")
        .eq("user_id", uid!)
        .eq("archived", false)
        .order("created_at");
      const ids = (g ?? []).map((x) => x.id);
      const { data: c } = ids.length
        ? await supabase.from("goal_checks").select("goal_id, day").in("goal_id", ids)
        : { data: [] as { goal_id: string; day: string }[] };
      return (g ?? []).map((x) => ({
        ...x,
        days: (c ?? []).filter((d) => d.goal_id === x.id).map((d) => d.day),
      }));
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["goals", uid] });

  async function add(t = title, e = emoji) {
    if (!uid || t.trim().length < 2) return;
    const { error } = await supabase
      .from("goals")
      .insert({ user_id: uid, title: t.trim(), emoji: e });
    if (error) {
      toast.error(
        error.message.includes("5 doelen")
          ? "Je hebt al 5 doelen. Rond er eerst een af."
          : "Toevoegen lukte niet.",
      );
      return;
    }
    setTitle("");
    refresh();
  }
  async function tick(id: string, done: boolean) {
    const { error } = done
      ? await supabase.from("goal_checks").delete().eq("goal_id", id).eq("day", today)
      : await supabase.from("goal_checks").insert({ goal_id: id, day: today });
    if (error) toast.error("Dat lukte niet.");
    else if (!done) {
      navigator.vibrate?.(20);
      toast.success("Goed bezig! 💪");
    }
    refresh();
  }
  async function finish(id: string) {
    await supabase.from("goals").update({ archived: true }).eq("id", id);
    toast.success("Doel afgerond 🎉");
    refresh();
  }

  return (
    <div className="space-y-4 pt-2">
      <div>
        <h1 className="text-3xl">🎯 Mijn doelen</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kleine doelen, elke dag een vinkje. Een dag gemist? Geen probleem, je pakt het gewoon weer
          op. Alleen jij ziet dit.
        </p>
      </div>

      {goals.map((g) => {
        const done = g.days.includes(today);
        const streak = goalStreak(g.days, today);
        return (
          <article key={g.id} className="space-y-3 rounded-3xl bg-card p-4 shadow-soft">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{g.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{g.title}</p>
                <p className="text-xs text-muted-foreground">
                  {streak
                    ? `🔥 ${streak} ${streak === 1 ? "dag" : "dagen"} op rij`
                    : "Begin vandaag!"}
                </p>
              </div>
              <button
                onClick={() => tick(g.id, done)}
                aria-label={done ? "Vinkje weghalen" : "Vandaag gedaan"}
                className={`grid size-12 place-items-center rounded-full text-2xl transition-transform active:scale-90 ${done ? "bg-primary text-primary-foreground" : "border-2 border-dashed border-primary/50"}`}
              >
                {done ? "✓" : ""}
              </button>
            </div>
            <div className="flex justify-between">
              {week.map((d) => (
                <div key={d} className="flex flex-col items-center gap-1">
                  <span
                    className={`size-6 rounded-full ${g.days.includes(d) ? "bg-primary" : "bg-muted"} ${d === today ? "ring-2 ring-primary/40" : ""}`}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {DAY_LETTERS[new Date(`${d}T12:00:00Z`).getUTCDay()]}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => finish(g.id)}
              className="text-xs text-muted-foreground underline"
            >
              Doel afronden
            </button>
          </article>
        );
      })}

      {goals.length < MAX_GOALS && (
        <section className="space-y-3 rounded-3xl bg-card p-4 shadow-soft">
          <p className="font-semibold">{goals.length ? "Nog een doel" : "Kies je eerste doel"}</p>
          <div className="flex flex-wrap gap-2">
            {GOAL_IDEAS.filter((i) => !goals.some((g) => g.title === i.title)).map((i) => (
              <button
                key={i.title}
                onClick={() => add(i.title, i.emoji)}
                className="rounded-full bg-muted px-3 py-1.5 text-sm"
              >
                {i.emoji} {i.title}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={emoji}
              maxLength={8}
              onChange={(e) => setEmoji(e.target.value)}
              className="w-14 rounded-2xl text-center"
              aria-label="Emoji"
            />
            <Input
              value={title}
              maxLength={60}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Of zelf iets bedenken…"
              className="rounded-2xl"
            />
            <Button
              disabled={title.trim().length < 2}
              onClick={() => add()}
              className="rounded-full"
            >
              +
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Maximaal {MAX_GOALS} doelen tegelijk. Kleiner is makkelijker vol te houden!
          </p>
        </section>
      )}
    </div>
  );
}
