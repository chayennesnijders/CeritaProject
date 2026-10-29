import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe, bandLabel } from "@/lib/auth";
import { HelpLines } from "@/components/HelpLines";
import { Button } from "@/components/ui/button";

const SOURCE: Record<string, string> = {
  post: "Bericht in een groep",
  comment: "Reactie in een groep",
  dm: "Privégesprek",
};

/** Beheer → Inbox: open care signals (words about suicide or self-harm), so an admin can reach out. */
export function SafetyAlerts() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["safety-alerts"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("safety_alerts")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (error)
        return {
          rows: [],
          people: {} as Record<string, { display_name: string; age_group: string }>,
        };
      const ids = [...new Set((rows ?? []).map((r) => r.author_id).filter(Boolean))] as string[];
      const { data: people } = ids.length
        ? await supabase.from("profiles").select("id, display_name, age_group").in("id", ids)
        : { data: [] };
      return { rows: rows ?? [], people: Object.fromEntries((people ?? []).map((p) => [p.id, p])) };
    },
  });
  const rows = data?.rows ?? [];
  if (rows.length === 0) return null;

  async function handled(id: string) {
    const { error } = await supabase
      .from("safety_alerts")
      .update({
        status: "afgehandeld",
        handled_by: me?.user.id ?? null,
        handled_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Afgehandeld 💛");
    qc.invalidateQueries({ queryKey: ["safety-alerts"] });
    qc.invalidateQueries({ queryKey: ["admin-news"] });
  }

  return (
    <section className="space-y-3 rounded-3xl border-2 border-destructive bg-card p-5 shadow-soft">
      <h2 className="text-lg">🆘 Zorgsignalen ({rows.length})</h2>
      <p className="text-xs text-muted-foreground">
        Iemand schreef iets over zelfmoord of zichzelf pijn doen. Diegene kreeg meteen hulpnummers
        te zien. Stuur een lief bericht, verwijs naar 113 of de Kindertelefoon, en volg je
        veiligheidsplan. Bij direct gevaar: bel 112.
      </p>
      {rows.map((a) => {
        const who = a.author_id ? data?.people[a.author_id] : undefined;
        return (
          <div key={a.id} className="space-y-2 rounded-2xl bg-muted p-3 text-sm">
            <p className="text-xs font-semibold text-muted-foreground">
              {SOURCE[a.source] ?? a.source} ·{" "}
              {new Date(a.created_at).toLocaleString("nl-NL", {
                timeZone: "Europe/Amsterdam",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="font-semibold">
              {who?.display_name ?? "Lid"}
              {who?.age_group && (
                <span className="ml-1 rounded-full bg-card px-1.5 text-[10px]">
                  {bandLabel(who.age_group)}
                </span>
              )}
            </p>
            <p className="whitespace-pre-wrap rounded-xl bg-card p-2">"{a.excerpt}"</p>
            <Button size="sm" className="rounded-full" onClick={() => handled(a.id)}>
              ✓ Ik heb contact gezocht / afgehandeld
            </Button>
          </div>
        );
      })}
      <details className="text-xs">
        <summary className="cursor-pointer font-semibold">Hulpnummers om door te geven</summary>
        <div className="mt-2">
          <HelpLines compact />
        </div>
      </details>
    </section>
  );
}
