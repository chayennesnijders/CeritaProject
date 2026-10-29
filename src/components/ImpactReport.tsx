import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { categoryEmoji, categoryLabel } from "@/lib/articles";
import { IMPACT_ROWS, impactSummary, showCount, type ImpactStats } from "@/lib/impact";
import { Button } from "@/components/ui/button";

/** Beheer → Impact: anonymous numbers to share with schools, municipalities and other partners. */
export function ImpactReport() {
  const {
    data: stats,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["impact"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("impact_stats");
      if (error) throw error;
      return data as unknown as ImpactStats;
    },
  });
  if (isLoading) return <p className="text-sm text-muted-foreground">Cijfers ophalen…</p>;
  if (isError || !stats)
    return (
      <p className="text-sm text-muted-foreground">
        De cijfers zijn er nog niet. Heb je update-15 al in Supabase geplakt?
      </p>
    );
  const c = stats.cijfers;
  const bands = [
    ["12–15", c["band_12_15"]],
    ["16–25", c["band_16_25"]],
    ["26–27", c["band_26_27"]],
  ] as const;
  const maxTopic = Math.max(1, ...stats.onderwerpen.map((o) => o.n));

  async function copy() {
    try {
      await navigator.clipboard.writeText(impactSummary(stats!));
      toast.success("Gekopieerd! Plak het in je mail of verslag 📋");
    } catch {
      toast.error("Kopiëren lukte niet.");
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-3xl bg-warm p-5 text-blush shadow-soft">
        <p className="text-xs uppercase tracking-widest opacity-75">Impact</p>
        <p className="mt-1 font-display text-2xl">CeritaProject in cijfers</p>
        <p className="mt-1 text-xs opacity-80">
          Anoniem, voor organisaties en subsidies. Aantallen kleiner dan 5 laten we niet zien.
          Bijgewerkt:{" "}
          {new Date(stats.gemaakt_op).toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" })}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {IMPACT_ROWS.map(([k, emoji, label]) => (
          <div key={k} className="rounded-3xl bg-card p-4 shadow-soft">
            <p className="text-xl">{emoji}</p>
            <p
              className={`font-display leading-tight ${(c[k] ?? 0) < 0 ? "text-base" : "text-3xl"}`}
            >
              {showCount(c[k])}
            </p>
            <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      <div className="rounded-3xl bg-card p-5 shadow-soft">
        <h2 className="text-lg">Leeftijdsgroepen</h2>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          {bands.map(([label, n]) => (
            <div key={label} className="rounded-2xl bg-muted p-3">
              <p className={`font-display ${(n ?? 0) < 0 ? "text-sm" : "text-2xl"}`}>
                {showCount(n)}
              </p>
              <p className="text-xs text-muted-foreground">{label} jaar</p>
            </div>
          ))}
        </div>
      </div>
      {stats.onderwerpen.length > 0 && (
        <div className="rounded-3xl bg-card p-5 shadow-soft">
          <h2 className="text-lg">Meest gelezen onderwerpen</h2>
          <p className="text-xs text-muted-foreground">Afgelopen 90 dagen</p>
          <div className="mt-3 space-y-2">
            {stats.onderwerpen.map((o) => (
              <div key={o.category}>
                <div className="flex justify-between text-sm">
                  <span>
                    {categoryEmoji(o.category)} {categoryLabel(o.category)}
                  </span>
                  <span className="font-semibold">{showCount(o.n)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${o.n < 0 ? 3 : Math.round((o.n / maxTopic) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 print:hidden">
        <Button className="rounded-full" onClick={copy}>
          📋 Kopieer tekst
        </Button>
        <Button variant="outline" className="rounded-full" onClick={() => window.print()}>
          🖨️ Print / PDF
        </Button>
      </div>
    </section>
  );
}
