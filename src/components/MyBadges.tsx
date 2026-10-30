import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BADGES, type BadgeStats } from "@/lib/badges";
import { challengeDay } from "@/lib/challenges";
import { moodStreak } from "@/lib/mood-calendar";

/** Your badge counts and which badges you earned (shared by the grid and the profile summary). */
export function useBadges(uid: string) {
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
  return { stats, earned };
}

/** Your badges: earned ones in colour, the rest grey with how to get them. */
export function MyBadges({ uid }: { uid: string }) {
  const { stats } = useBadges(uid);

  return (
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
  );
}
