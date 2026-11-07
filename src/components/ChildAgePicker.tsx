import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { celebrate } from "@/lib/celebrate";
import { CHILD_BANDS, isChildBand, type ChildBand } from "@/lib/child-age";

/** The age group(s) of a parent's child(ren). `installed` is false until update 55 is in Supabase. */
export function useChildAges(uid: string) {
  return useQuery({
    queryKey: ["parent-settings", uid],
    queryFn: async () => {
      const { data, error } = await supabase.from("parent_settings").select("child_ages").eq("user_id", uid).maybeSingle();
      return {
        installed: !error,
        set: !!data,
        bands: (data?.child_ages ?? []).filter(isChildBand),
      };
    },
  });
}

/** Tap the age group(s) of your child(ren); several children = several groups. */
export function ChildAgePicker({
  uid,
  initial,
  onDone,
  first = false,
}: {
  uid: string;
  initial: readonly ChildBand[];
  onDone?: () => void;
  first?: boolean;
}) {
  const qc = useQueryClient();
  const [chosen, setChosen] = useState<ChildBand[]>([...initial]);
  const [busy, setBusy] = useState(false);
  const toggle = (b: ChildBand) => setChosen((c) => (c.includes(b) ? c.filter((x) => x !== b) : [...c, b]));

  async function save() {
    setBusy(true);
    const { error } = await supabase
      .from("parent_settings")
      .upsert({ user_id: uid, child_ages: chosen, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) {
      toast.error("Opslaan lukte niet. Probeer het later opnieuw.");
      return;
    }
    if (first && chosen.length) celebrate("klein", { set: "hartjes" });
    toast.success(chosen.length ? "Je tips passen nu bij de leeftijd van je kind 💛" : "Je krijgt algemene tips");
    await qc.invalidateQueries({ queryKey: ["parent-settings", uid] });
    onDone?.();
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {CHILD_BANDS.map((b) => {
          const on = chosen.includes(b.id);
          return (
            <button
              key={b.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => toggle(b.id)}
              className={`flex items-center gap-2 rounded-2xl border-2 p-2.5 text-left transition active:scale-95 ${on ? "border-primary bg-primary/10" : "border-input bg-card"}`}
            >
              <span className="text-2xl">{b.emoji}</span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{b.label}</span>
                <span className="block text-[11px] text-muted-foreground">{b.name}</span>
              </span>
              {on && <span className="ml-auto text-primary">✓</span>}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Meer kinderen? Kies meerdere. We vragen geen naam of geboortedatum, en alleen jij ziet wat je kiest.
      </p>
      <button
        onClick={() => void save()}
        disabled={busy}
        className="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {busy ? "Bezig…" : chosen.length ? "Opslaan" : "Geen leeftijd, algemene tips"}
      </button>
    </div>
  );
}
