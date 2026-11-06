import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { GUIDES, GUIDES_SOON, guidePercent } from "@/lib/guides";

export const Route = createFileRoute("/_authenticated/handleidingen/")({
  head: () => ({ meta: [{ title: "Handleidingen voor ouders — CeritaProject" }] }),
  component: GuidesPage,
});

function GuidesPage() {
  const { data: me } = useMe();
  const uid = me?.user.id;
  const { data: progress } = useQuery({
    queryKey: ["guide-progress", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase.from("guide_progress").select("guide, step, completed_at").eq("user_id", uid!);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4 pb-6">
      <header className="space-y-1 pt-2">
        <p className="text-3xl">📘</p>
        <h1 className="text-2xl">Handleidingen</h1>
        <p className="text-sm text-muted-foreground">
          Korte, praktische stappen voor ouders en verzorgers. Je oefent met echte situaties en kiest wat bij jou past.
          Je voortgang wordt bewaard, dus je kunt altijd later verder.
        </p>
      </header>

      {GUIDES.map((g) => {
        const p = progress?.find((r) => r.guide === g.slug);
        const pct = p ? guidePercent(g, p.step, !!p.completed_at) : 0;
        return (
          <Link
            key={g.slug}
            to="/handleidingen/$slug"
            params={{ slug: g.slug }}
            className="block space-y-3 rounded-3xl bg-card p-5 shadow-soft transition active:scale-[0.99]"
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl">{g.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug">{g.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{g.summary}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>⏱️ ±{g.minutes} min</span>
              <span>· {g.steps.length} stappen</span>
              <span className="ml-auto font-semibold text-primary">
                {pct === 100 ? "✅ Klaar · opnieuw bekijken" : pct > 0 ? `Verder (${pct}%)` : "Beginnen →"}
              </span>
            </div>
            {pct > 0 && (
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
            )}
          </Link>
        );
      })}

      <section className="space-y-2 rounded-3xl bg-secondary p-4 text-secondary-foreground">
        <p className="font-semibold">Binnenkort</p>
        {GUIDES_SOON.map((g) => (
          <p key={g.title} className="text-sm">
            {g.emoji} {g.title}
          </p>
        ))}
      </section>
    </div>
  );
}
