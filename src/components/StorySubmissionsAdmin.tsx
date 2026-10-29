import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { categoryLabel } from "@/lib/articles";

const STATUSES = ["nieuw", "in_behandeling", "geplaatst", "afgewezen"] as const;
const STATUS_LABELS: Record<string, string> = {
  nieuw: "Nieuw",
  in_behandeling: "In behandeling",
  geplaatst: "Geplaatst",
  afgewezen: "Afgewezen",
};

/** Beheerders zien hier ingestuurde verhalen van leden en zetten de status. */
export function StorySubmissionsAdmin() {
  const qc = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["admin-stories"],
    queryFn: async () => {
      const { data: subs } = await supabase
        .from("story_submissions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      const ids = [...new Set((subs ?? []).map((s) => s.user_id))];
      const { data: people } = ids.length
        ? await supabase.from("profiles").select("id, display_name").in("id", ids)
        : { data: [] };
      const names = Object.fromEntries((people ?? []).map((p) => [p.id, p.display_name]));
      return { subs: subs ?? [], names };
    },
  });

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("story_submissions").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-stories"] });
  }

  const subs = data?.subs ?? [];
  const fresh = subs.filter((s) => s.status === "nieuw").length;

  return (
    <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
      <h2 className="text-lg">
        Ingestuurde verhalen{" "}
        {fresh > 0 && <span className="text-sm text-primary">({fresh} nieuw)</span>}
      </h2>
      <p className="text-xs text-muted-foreground">
        Verhalen die leden zelf hebben ingestuurd. Alleen jij ziet wie het instuurde. Plaats je een
        verhaal, haal dan namen en herkenbare gegevens eruit.
      </p>
      <div className="space-y-3">
        {subs.map((s) => (
          <div key={s.id} className="rounded-2xl bg-muted p-3 text-sm">
            <button
              className="w-full text-left"
              onClick={() => setOpen(open === s.id ? null : s.id)}
            >
              <p className="font-semibold">{s.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {categoryLabel(s.category)} · {STATUS_LABELS[s.status]} · ingestuurd door{" "}
                {data?.names[s.user_id] ?? "onbekend lid"} op{" "}
                {new Date(s.created_at).toLocaleString("nl-NL")}
              </p>
            </button>
            {open === s.id && (
              <div className="mt-2 space-y-2">
                <p
                  className={`rounded-xl p-2 text-xs font-semibold ${s.may_publish ? "bg-emerald-100 text-emerald-800" : "bg-destructive/10 text-destructive"}`}
                >
                  {s.may_publish
                    ? "✅ Mag gepubliceerd worden"
                    : "🚫 Geen toestemming om te publiceren"}
                </p>
                {(s.pen_name || s.contact_email) && (
                  <p className="text-xs">
                    {s.pen_name && (
                      <>
                        Naam bij het verhaal: <b>{s.pen_name}</b>
                        <br />
                      </>
                    )}
                    {s.contact_email && (
                      <>
                        E-mail voor contact:{" "}
                        <a className="text-primary underline" href={`mailto:${s.contact_email}`}>
                          {s.contact_email}
                        </a>
                      </>
                    )}
                  </p>
                )}
                <p className="whitespace-pre-wrap rounded-xl bg-card p-3 text-[13px] leading-relaxed">
                  {s.body}
                </p>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.filter((st) => st !== s.status).map((st) => (
                    <Button
                      key={st}
                      size="sm"
                      variant={st === "afgewezen" ? "destructive" : "outline"}
                      className="rounded-full"
                      onClick={() => setStatus(s.id, st)}
                    >
                      {STATUS_LABELS[st]}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {subs.length === 0 && (
          <p className="text-sm text-muted-foreground">Nog geen ingestuurde verhalen.</p>
        )}
      </div>
    </section>
  );
}
