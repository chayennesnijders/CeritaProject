import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { REFLECTIONS, type Guide, type Reflection } from "@/lib/guides";

/** "How did your plan go?" a few days after a guide, with advice that fits the answer. */
export function GuideCheckIn({
  guide,
  uid,
  plan,
  reflection,
  onAnswered,
}: {
  guide: Guide;
  uid: string;
  plan: string;
  reflection: Reflection | null;
  onAnswered?: () => void;
}) {
  const qc = useQueryClient();
  const [answer, setAnswer] = useState<Reflection | null>(reflection);
  const pick = async (r: Reflection) => {
    setAnswer(r);
    onAnswered?.();
    const { error } = await supabase
      .from("guide_progress")
      .update({ reflection: r, reflected_at: new Date().toISOString() })
      .eq("user_id", uid)
      .eq("guide", guide.slug);
    if (error) toast.error("Je antwoord kon niet worden bewaard, maar het advies staat hieronder.");
    void qc.invalidateQueries({ queryKey: ["guide-progress", uid] });
  };
  return (
    <section className="space-y-3 rounded-3xl border-2 border-primary bg-card p-5 shadow-soft">
      <p className="text-sm font-semibold text-primary">
        {guide.emoji} {guide.title}
      </p>
      <h2 className="text-lg leading-snug">Hoe ging het met je plan?</h2>
      {plan && <p className="rounded-2xl bg-muted p-3 text-sm italic">“{plan}”</p>}
      <div className="grid gap-2">
        {REFLECTIONS.map((r) => (
          <button
            key={r.id}
            onClick={() => void pick(r.id)}
            aria-pressed={answer === r.id}
            className={`flex items-center gap-3 rounded-2xl border p-3 text-left text-sm transition active:scale-[0.99] ${answer === r.id ? "border-primary bg-primary/10 font-semibold" : ""}`}
          >
            <span className="text-2xl">{r.emoji}</span>
            {r.label}
          </button>
        ))}
      </div>
      {answer && (
        <p className="rounded-2xl bg-secondary p-3 text-sm leading-relaxed text-secondary-foreground" role="status">
          💡 {guide.followUp[answer]}
        </p>
      )}
      <p className="text-xs text-muted-foreground">Alleen jij ziet je antwoord.</p>
    </section>
  );
}
