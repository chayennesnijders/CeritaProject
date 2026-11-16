import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { HALL_OF_FAME_MIN } from "@/lib/ambassador";

export const Route = createFileRoute("/_authenticated/hall-of-fame")({
  head: () => ({ meta: [{ title: "Hall of Fame — CeritaProject" }] }),
  component: HallOfFamePage,
});

const MEDALS = ["🥇", "🥈", "🥉"];

/** The Cerita Hall of Fame: Legend ambassadors who chose to be shown. Only name, photo and points. */
function HallOfFamePage() {
  const { data: me } = useMe();
  const { data: rows, isLoading } = useQuery({
    queryKey: ["hall-of-fame"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("hall_of_fame");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-5 pb-8 pt-2">
      <section className="relative overflow-hidden rounded-3xl bg-primary p-6 text-center text-primary-foreground shadow-soft">
        <span className="absolute -left-4 -top-4 text-7xl opacity-20" aria-hidden>
          ✨
        </span>
        <span className="absolute -bottom-6 -right-4 text-7xl opacity-20" aria-hidden>
          💖
        </span>
        <p className="text-5xl">👑</p>
        <h1 className="mt-2 text-2xl">Cerita Hall of Fame</h1>
        <p className="mt-2 text-sm opacity-90">
          Deze ambassadeurs hebben CeritaProject mee groot gemaakt. Dankjewel dat jullie zoveel jongeren de weg hebben laten
          vinden. 💖
        </p>
      </section>

      {isLoading ? null : rows && rows.length > 0 ? (
        <ol className="space-y-3">
          {rows.map((r, i) => (
            <li key={`${r.display_name}-${r.since}`} className="flex items-center gap-3 rounded-3xl bg-card p-4 shadow-soft">
              <span className="w-8 text-center text-2xl">{MEDALS[i] ?? "👑"}</span>
              {r.avatar_url ? (
                <img src={r.avatar_url} alt="" className="h-12 w-12 shrink-0 rounded-full border-2 border-primary object-cover" />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-xl">
                  💖
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{r.display_name}</p>
                <p className="text-xs text-muted-foreground">
                  Legend · ambassadeur sinds {new Date(r.since).toLocaleDateString("nl-NL", { month: "long", year: "numeric" })}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary">⭐ {Number(r.points)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="space-y-2 rounded-3xl bg-card p-6 text-center shadow-soft">
          <p className="text-3xl">🌱</p>
          <p className="font-semibold">Nog niemand in de Hall of Fame</p>
          <p className="text-sm text-muted-foreground">
            Wie als ambassadeur {HALL_OF_FAME_MIN} punten haalt, wordt Legend en mag hier komen te staan.
          </p>
        </div>
      )}

      <p className="px-2 text-center text-xs text-muted-foreground">
        Alleen ambassadeurs die zelf ja zeggen staan hier, met hun naam en foto.{" "}
        {me?.isAmbassador ? (
          <Link to="/ambassadeur" className="underline">
            Naar je portaal
          </Link>
        ) : (
          <Link to="/ambassadeur" className="underline">
            Wat is een ambassadeur?
          </Link>
        )}
      </p>
    </div>
  );
}
