import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { founderStory } from "@/lib/founder-story";

const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

/** Home, owner only: today's little story about what you built and where it can go. */
export function FounderStory({ day }: { day: string }) {
  const { data: stats } = useQuery({
    queryKey: ["founder-stats"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const [members, waitlist, stories, groups, coaches] = await Promise.all([
        count(supabase.from("profiles").select("id", { count: "exact", head: true })),
        count(supabase.from("waitlist").select("id", { count: "exact", head: true })),
        count(
          supabase
            .from("articles")
            .select("id", { count: "exact", head: true })
            .eq("kind", "verhaal")
            .eq("is_published", true),
        ),
        count(
          supabase
            .from("groups")
            .select("id", { count: "exact", head: true })
            .eq("is_archived", false),
        ),
        count(
          supabase
            .from("coaches")
            .select("user_id", { count: "exact", head: true })
            .eq("active", true),
        ),
      ]);
      return { members, waitlist, stories, groups, coaches };
    },
  });
  if (!stats) return null;
  const s = founderStory(stats, day);
  return (
    <section className="space-y-3 rounded-3xl bg-warm p-5 text-blush shadow-soft animate-in fade-in">
      <p className="text-xs uppercase tracking-widest opacity-75">✨ Jouw verhaal van vandaag</p>
      <h2 className="font-display text-2xl leading-tight">{s.title}</h2>
      <p className="text-sm leading-relaxed">
        <span className="font-semibold">🏆 Wat je al bereikt hebt: </span>
        {s.now}
      </p>
      <p className="text-sm leading-relaxed">
        <span className="font-semibold">🌈 Waar het naartoe kan: </span>
        {s.dream}
      </p>
      <p className="rounded-2xl bg-white/15 p-3 text-sm">
        <span className="font-semibold">👣 Kleine stap voor vandaag: </span>
        {s.step}
      </p>
    </section>
  );
}
