import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { GuideCheckIn } from "@/components/GuideCheckIn";
import { GUIDES, GUIDES_SOON, guidePercent, needsCheckIn } from "@/lib/guides";

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
      const { data } = await supabase.from("guide_progress").select("guide, step, plan, completed_at, reflection").eq("user_id", uid!);
      return data ?? [];
    },
  });

  // Keep a check-in on screen after answering, so the advice stays readable.
  const [answered, setAnswered] = useState<Set<string>>(new Set());

  return (
    <div className="space-y-4 pb-6">
      <header className="space-y-1 pt-2">
        <p className="text-3xl">📘</p>
        <h1 className="text-2xl">Handleidingen</h1>
        <p className="text-sm text-muted-foreground">
          Praktische trainingen voor ouders en verzorgers. Je oefent met echte situaties, ziet voorbeeldgesprekken met
          uitleg, en gaat weg met een spiekbriefje en een eigen plan. Twee dagen later vragen we hoe het ging.
        </p>
      </header>

      {uid &&
        GUIDES.map((g) => {
          const p = progress?.find((r) => r.guide === g.slug);
          return p && (answered.has(g.slug) || needsCheckIn(p, Date.now())) ? (
            <GuideCheckIn
              key={`checkin-${g.slug}`}
              guide={g}
              uid={uid}
              plan={p.plan}
              reflection={null}
              onAnswered={() => setAnswered((s) => new Set(s).add(g.slug))}
            />
          ) : null;
        })}

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
              <span className="whitespace-nowrap">⏱️ ±{g.minutes} min</span>
              <span className="whitespace-nowrap">· {g.steps.length} stappen</span>
              <span className="ml-auto whitespace-nowrap font-semibold text-primary">
                {pct === 100 ? "✅ Klaar" : pct > 0 ? `Verder (${pct}%)` : "Beginnen →"}
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
