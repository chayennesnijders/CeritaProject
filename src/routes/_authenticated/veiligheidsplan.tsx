import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Phone, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HelpLines } from "@/components/HelpLines";
import { PLAN_SECTIONS, phoneIn, stepsFilled, toPlan, type SafetyPlan } from "@/lib/safety-plan";
import type { Json } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/veiligheidsplan")({
  head: () => ({
    meta: [
      { title: "Mijn veiligheidsplan — CeritaProject" },
      {
        name: "description",
        content: "Jouw eigen plan voor als het even niet goed gaat. Alleen jij ziet het.",
      },
    ],
  }),
  component: SafetyPlanPage,
});

/** A private safety plan: six steps for when things get hard. Only the member can see it. */
function SafetyPlanPage() {
  const { data: me } = useMe();
  const uid = me?.user.id;
  const qc = useQueryClient();
  const [plan, setPlan] = useState<SafetyPlan | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: stored, isLoading } = useQuery({
    queryKey: ["safety-plan", uid],
    enabled: !!uid,
    queryFn: async () =>
      toPlan(
        (await supabase.from("safety_plans").select("plan").eq("user_id", uid!).maybeSingle()).data
          ?.plan,
      ),
  });
  useEffect(() => {
    if (stored) {
      setPlan(stored);
      if (stepsFilled(stored) === 0) setEditing(true);
    }
  }, [stored]);

  async function save() {
    if (!uid || !plan) return;
    setSaving(true);
    const clean = Object.fromEntries(
      Object.entries(plan).map(([k, v]) => [k, v.map((l) => l.trim()).filter(Boolean)]),
    );
    const { error } = await supabase
      .from("safety_plans")
      .upsert({ user_id: uid, plan: clean as Json, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) {
      toast.error("Opslaan lukte niet.");
      return;
    }
    toast.success("Je plan is bewaard 💛");
    setEditing(false);
    qc.invalidateQueries({ queryKey: ["safety-plan", uid] });
  }

  if (isLoading || !plan) return <p className="pt-6 text-sm text-muted-foreground">Laden…</p>;

  return (
    <div className="space-y-4 pt-2">
      <div>
        <h1 className="text-3xl">🛟 Mijn veiligheidsplan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Een plan voor als het even niet goed gaat. Maak het als je je rustig voelt, dan heb je het
          klaar als je het nodig hebt. <strong>Alleen jij ziet dit</strong>, ook beheerders niet.
        </p>
      </div>

      {PLAN_SECTIONS.map((s, i) => (
        <section key={s.id} className="space-y-2 rounded-3xl bg-card p-4 shadow-soft">
          <p className="font-semibold">
            <span className="mr-1 text-xs text-muted-foreground">Stap {i + 1}</span> {s.emoji}{" "}
            {s.title}
          </p>
          {editing && <p className="text-xs text-muted-foreground">{s.hint}</p>}
          {s.id === "hulp" && <HelpLines compact />}
          {editing ? (
            <>
              {plan[s.id].map((line, j) => (
                <div key={j} className="flex gap-2">
                  <Input
                    value={line}
                    maxLength={200}
                    placeholder={s.placeholder}
                    onChange={(e) =>
                      setPlan({
                        ...plan,
                        [s.id]: plan[s.id].map((l, k) => (k === j ? e.target.value : l)),
                      })
                    }
                    className="rounded-2xl"
                  />
                  <button
                    aria-label="Regel weghalen"
                    onClick={() =>
                      setPlan({ ...plan, [s.id]: plan[s.id].filter((_, k) => k !== j) })
                    }
                    className="p-2 text-muted-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
              {plan[s.id].length < 10 && (
                <button
                  onClick={() => setPlan({ ...plan, [s.id]: [...plan[s.id], ""] })}
                  className="flex items-center gap-1 text-sm text-primary"
                >
                  <Plus className="size-4" /> {plan[s.id].length ? "Nog iets" : "Toevoegen"}
                </button>
              )}
            </>
          ) : plan[s.id].length ? (
            <ul className="space-y-1.5">
              {plan[s.id].map((line, j) => {
                const tel = phoneIn(line);
                return (
                  <li
                    key={j}
                    className="flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-sm"
                  >
                    <span className="flex-1">{line}</span>
                    {tel && (
                      <a
                        href={`tel:${tel}`}
                        className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                      >
                        <Phone className="size-3" /> Bellen
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            s.id !== "hulp" && <p className="text-sm text-muted-foreground">Nog niets ingevuld.</p>
          )}
        </section>
      ))}

      {editing ? (
        <Button disabled={saving} onClick={save} className="h-12 w-full rounded-full">
          {saving ? "Even geduld…" : "💾 Plan bewaren"}
        </Button>
      ) : (
        <Button
          variant="outline"
          onClick={() => setEditing(true)}
          className="h-12 w-full rounded-full"
        >
          ✏️ Plan aanpassen
        </Button>
      )}
      <p className="text-center text-xs text-muted-foreground">
        Tip: vul je plan samen in met iemand die je vertrouwt, of met je hulpverlener.
      </p>
      <Link to="/rust" className="block text-center text-sm text-primary underline">
        🫧 Nu even rustig ademen met Riti
      </Link>
    </div>
  );
}
