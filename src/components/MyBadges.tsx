import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BADGES, type BadgeStats } from "@/lib/badges";
import { challengeDay } from "@/lib/challenges";
import { moodStreak } from "@/lib/mood-calendar";

/** Your badges on your profile: earned ones in colour, the rest grey with how to get them. */
export function MyBadges({ uid }: { uid: string }) {
  const { data: stats } = useQuery({
    queryKey: ["badge-stats", uid],
    queryFn: async () => {
      const [s, moods] = await Promise.all([
        supabase.rpc("my_badge_stats"),
        supabase.from("mood_entries").select("day").eq("user_id", uid),
      ]);
      return {
        ...(s.data as Omit<BadgeStats, "mood_streak">),
        mood_streak: moodStreak(
          (moods.data ?? []).map((m) => m.day),
          challengeDay(),
        ),
      } as BadgeStats;
    },
  });
  const earned = stats ? BADGES.filter((b) => b.earned(stats)) : [];

  return (
    <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <h2 className="text-lg">🏅 Mijn badges</h2>
        <span className="text-sm font-semibold text-muted-foreground">
          {earned.length}/{BADGES.length}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {BADGES.map((b) => {
          const has = !!stats && b.earned(stats);
          return (
            <div
              key={b.id}
              className={`flex flex-col items-center rounded-2xl p-2 text-center ${has ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              <span className={`text-3xl ${has ? "" : "opacity-30 grayscale"}`}>{b.emoji}</span>
              <span className="mt-1 text-[11px] font-bold leading-tight">{b.name}</span>
              <span className="mt-0.5 text-[10px] leading-tight opacity-80">
                {has ? "Gehaald! ✓" : b.how}
              </span>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs font-semibold">
        <Link to="/stemming" className="rounded-2xl bg-muted p-2">
          📅 Stemming
        </Link>
        <Link to="/complimenten" className="rounded-2xl bg-muted p-2">
          💐 Complimenten
        </Link>
        <Link to="/rust" className="rounded-2xl bg-muted p-2">
          🫧 Rustmoment
        </Link>
      </div>
    </section>
  );
}
