import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { celebrate } from "@/lib/celebrate";
import { GuideCheckIn } from "@/components/GuideCheckIn";
import { ReadAloud } from "@/components/ReadAloud";
import {
  cheatsheetText,
  guideBySlug,
  needsCheckIn,
  stepSpeech,
  type Guide,
  type GuideOption,
  type GuideStep,
  type Reflection,
} from "@/lib/guides";

export const Route = createFileRoute("/_authenticated/handleidingen/$slug")({
  head: () => ({ meta: [{ title: "Handleiding — CeritaProject" }] }),
  component: GuidePage,
});

const VERDICT: Record<GuideOption["verdict"], { label: string; cls: string }> = {
  goed: { label: "✅ Goede keuze", cls: "bg-[#e3f6e8] text-[#1d5a2c]" },
  "kan beter": { label: "🤔 Kan beter", cls: "bg-[#fff4d6] text-[#5c4300]" },
  "liever niet": { label: "✋ Liever niet", cls: "bg-[#fde7e7] text-[#7a1f1f]" },
};

function GuidePage() {
  const { slug } = Route.useParams();
  const guide = guideBySlug(slug);
  const { data: me } = useMe();
  const uid = me?.user.id;
  if (!guide)
    return (
      <div className="mt-6 rounded-3xl bg-card p-6 text-center shadow-soft">
        <p>Deze handleiding bestaat niet (meer).</p>
        <Link to="/handleidingen" className="mt-3 inline-block font-semibold text-primary underline">
          Naar alle handleidingen
        </Link>
      </div>
    );
  if (!uid) return null;
  return <GuideRunner key={guide.slug} guide={guide} uid={uid} />;
}

function GuideRunner({ guide, uid }: { guide: Guide; uid: string }) {
  const qc = useQueryClient();
  const total = guide.steps.length;
  const { data: saved, isLoading } = useQuery({
    queryKey: ["guide-progress", uid, guide.slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("guide_progress")
        .select("step, plan, completed_at, reflection")
        .eq("user_id", uid)
        .eq("guide", guide.slug)
        .maybeSingle();
      return data;
    },
  });
  // step === total means the summary ("spiekbriefje") screen.
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState("");
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current || isLoading) return;
    loaded.current = true;
    if (saved) {
      // Finished guides open on the summary, unless the parent is doing it again (step went back to 0).
      setStep(saved.completed_at && saved.step >= total ? total : Math.min(saved.step, total));
      setPlan(saved.plan);
    }
  }, [saved, isLoading, total]);

  const save = async (next: number, done = false, planText = plan) => {
    const { error } = await supabase.from("guide_progress").upsert({
      user_id: uid,
      guide: guide.slug,
      step: Math.min(next, total),
      plan: planText.slice(0, 500),
      updated_at: new Date().toISOString(),
      ...(done ? { completed_at: new Date().toISOString() } : {}),
    });
    if (error) toast.error("Je voortgang kon niet worden bewaard. Je kunt gewoon verder.");
    void qc.invalidateQueries({ queryKey: ["guide-progress", uid] });
  };
  const go = (next: number) => {
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
    const finishing = next === total && step === total - 1;
    if (finishing) celebrate("groot", { set: "hartjes" });
    void save(next, next === total);
  };

  const pct = Math.round((Math.min(step, total) / total) * 100);
  const current = guide.steps[step];

  return (
    <div className="space-y-4 pb-6">
      <div className="space-y-2 pt-2">
        <div className="flex items-center gap-2 text-sm">
          <Link to="/handleidingen" className="text-muted-foreground" aria-label="Terug naar handleidingen">
            ← Handleidingen
          </Link>
          <span className="ml-auto text-xs text-muted-foreground">
            {step < total ? `Stap ${step + 1} van ${total}` : "Klaar 🎉"}
          </span>
        </div>
        <div className="flex gap-1">
          {guide.steps.map((_, i) => (
            <button
              key={i}
              aria-label={`Naar stap ${i + 1}`}
              onClick={() => i <= (saved?.completed_at ? total : Math.max(step, saved?.step ?? 0)) && go(i)}
              className={`h-2 flex-1 rounded-full transition ${i < step ? "bg-primary" : i === step ? "bg-primary/60" : "bg-muted"}`}
            />
          ))}
        </div>
        <span className="sr-only">{pct}% klaar</span>
      </div>

      {step === 0 && (
        <header className="space-y-3">
          <p className="text-3xl">{guide.emoji}</p>
          <h1 className="text-2xl leading-tight">{guide.title}</h1>
          <div className="space-y-2 rounded-3xl bg-secondary p-4 text-sm text-secondary-foreground">
            <p className="font-semibold">Na deze handleiding:</p>
            <ul className="space-y-1">
              {guide.outcomes.map((o) => (
                <li key={o}>✔️ {o}</li>
              ))}
            </ul>
            <p className="pt-1 text-xs opacity-80">
              {guide.forWho} · ±{guide.minutes} min · je kunt altijd stoppen en later verder
            </p>
          </div>
        </header>
      )}

      {current ? (
        <>
          <div className="flex justify-end">
            <ReadAloud key={step} text={stepSpeech(current)} />
          </div>
          <StepView key={step} step={current} plan={plan} setPlan={setPlan} onPlanSave={(t) => void save(step, false, t)} />
        </>
      ) : (
        <>
          {saved?.completed_at &&
            (saved.reflection ||
              needsCheckIn({ completed_at: saved.completed_at, plan: saved.plan, reflection: null }, Date.now())) && (
              <GuideCheckIn
                guide={guide}
                uid={uid}
                plan={saved.plan}
                reflection={(saved.reflection as Reflection | null) ?? null}
              />
            )}
          <Cheatsheet guide={guide} plan={plan} />
        </>
      )}

      <div className="flex gap-2">
        {step > 0 && (
          <button onClick={() => go(step - 1)} className="rounded-full border px-4 py-3 text-sm font-semibold">
            ← Terug
          </button>
        )}
        {step < total ? (
          <button
            onClick={() => go(step + 1)}
            className="flex-1 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
          >
            {step === total - 1 ? "Afronden 🎉" : "Volgende →"}
          </button>
        ) : (
          <>
            <button onClick={() => go(0)} className="rounded-full border px-4 py-3 text-sm font-semibold">
              🔁 Opnieuw doen
            </button>
            <Link
              to="/handleidingen"
            className="flex-1 rounded-full bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground"
          >
              Naar alle handleidingen
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function StepView({
  step,
  plan,
  setPlan,
  onPlanSave,
}: {
  step: GuideStep;
  plan: string;
  setPlan: (s: string) => void;
  onPlanSave: (s: string) => void;
}) {
  const card = "space-y-3 rounded-3xl bg-card p-5 shadow-soft";
  switch (step.kind) {
    case "uitleg":
      return (
        <section className={card}>
          <h2 className="text-lg">{step.title}</h2>
          {step.text.map((t) => (
            <p key={t} className="text-sm leading-relaxed">
              {t}
            </p>
          ))}
          {step.tip && <p className="rounded-2xl bg-secondary p-3 text-sm text-secondary-foreground">💡 {step.tip}</p>}
        </section>
      );
    case "keuze":
      return <ChoiceStep step={step} />;
    case "zinnen":
      return <SentencesStep step={step} />;
    case "checklist":
      return <ChecklistStep step={step} />;
    case "gesprek":
      return <ConversationStep step={step} />;
    case "plan":
      return (
        <section className={card}>
          <h2 className="text-lg">{step.title}</h2>
          <p className="text-sm">{step.text}</p>
          <div className="space-y-2">
            {step.actions.map((a) => (
              <button
                key={a}
                onClick={() => {
                  setPlan(a);
                  onPlanSave(a);
                }}
                className={`block w-full rounded-2xl border p-3 text-left text-sm transition ${plan === a ? "border-primary bg-primary/10 font-semibold" : ""}`}
              >
                {plan === a ? "✅ " : ""}
                {a}
              </button>
            ))}
          </div>
          <label className="block text-sm">
            <span className="text-muted-foreground">Of schrijf het zelf op:</span>
            <textarea
              value={step.actions.includes(plan) ? "" : plan}
              onChange={(e) => setPlan(e.target.value.slice(0, 500))}
              onBlur={(e) => e.target.value && onPlanSave(e.target.value)}
              rows={2}
              placeholder="Bijvoorbeeld: zaterdag samen boodschappen doen en vragen hoe het op school gaat"
              className="mt-1 w-full rounded-2xl border bg-background p-3 text-sm"
            />
          </label>
          <p className="text-xs text-muted-foreground">Alleen jij ziet wat je hier kiest of schrijft.</p>
        </section>
      );
  }
}

function ChoiceStep({ step }: { step: Extract<GuideStep, { kind: "keuze" }> }) {
  const [picked, setPicked] = useState<number | null>(null);
  const chosen = picked === null ? null : step.options[picked];
  return (
    <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
      <h2 className="text-lg">{step.title}</h2>
      <p className="rounded-2xl bg-muted p-3 text-sm italic">🎬 {step.situation}</p>
      <p className="text-sm font-semibold">{step.question}</p>
      <div className="space-y-2">
        {step.options.map((o, i) => (
          <button
            key={o.text}
            onClick={() => setPicked(i)}
            className={`block w-full rounded-2xl border p-3 text-left text-sm transition ${picked === i ? "border-primary bg-primary/10" : ""}`}
          >
            {o.text}
          </button>
        ))}
      </div>
      {chosen && (
        <div className={`rounded-2xl p-3 text-sm ${VERDICT[chosen.verdict].cls}`} role="status">
          <p className="font-semibold">{VERDICT[chosen.verdict].label}</p>
          <p className="mt-1">{chosen.feedback}</p>
          {chosen.verdict !== "goed" && <p className="mt-2 text-xs">Probeer gerust een ander antwoord.</p>}
        </div>
      )}
    </section>
  );
}

function SentencesStep({ step }: { step: Extract<GuideStep, { kind: "zinnen" }> }) {
  const [fav, setFav] = useState<string | null>(null);
  return (
    <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
      <h2 className="text-lg">{step.title}</h2>
      <p className="text-sm">{step.text}</p>
      <div className="space-y-2">
        {step.sentences.map((s) => (
          <button
            key={s}
            onClick={() => setFav(s)}
            className={`block w-full rounded-2xl border p-3 text-left text-sm transition ${fav === s ? "border-primary bg-primary/10" : ""}`}
          >
            {fav === s ? "⭐ " : "💬 "}‘{s}’
          </button>
        ))}
      </div>
      {fav && (
        <p className="rounded-2xl bg-secondary p-3 text-sm text-secondary-foreground">
          Mooi. Zeg de zin een keer hardop, in je eigen woorden. Dan ligt hij klaar als het moment komt.
        </p>
      )}
      {step.avoid && (
        <div className="rounded-2xl bg-[#fde7e7] p-3 text-sm text-[#7a1f1f]">
          <p className="font-semibold">Liever niet:</p>
          {step.avoid.map((a) => (
            <p key={a}>✋ ‘{a}’</p>
          ))}
        </div>
      )}
    </section>
  );
}

function ChecklistStep({ step }: { step: Extract<GuideStep, { kind: "checklist" }> }) {
  const [ticked, setTicked] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setTicked((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  return (
    <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
      <h2 className="text-lg">{step.title}</h2>
      <p className="text-sm">{step.text}</p>
      <div className="space-y-2">
        {step.items.map((it, i) => (
          <label key={it} className="flex cursor-pointer items-start gap-3 rounded-2xl border p-3 text-sm">
            <input type="checkbox" checked={ticked.has(i)} onChange={() => toggle(i)} className="mt-0.5 size-4" />
            <span>{it}</span>
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Wat je aanvinkt wordt nergens bewaard.</p>
      {ticked.size > 0 && (
        <p className="rounded-2xl bg-[#fff4d6] p-3 text-sm text-[#5c4300]">
          Je herkent {ticked.size === 1 ? "één signaal" : `${ticked.size} signalen`}. Dat is geen diagnose, maar wel een
          reden om er serieus naar te kijken en hulp te vragen.
        </p>
      )}
      {step.after && <p className="rounded-2xl bg-secondary p-3 text-sm text-secondary-foreground">📞 {step.after}</p>}
    </section>
  );
}

function ConversationStep({ step }: { step: Extract<GuideStep, { kind: "gesprek" }> }) {
  const [open, setOpen] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  const tips = step.lines.filter((l) => l.why).length;
  return (
    <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
      <h2 className="text-lg">{step.title}</h2>
      <p className="text-sm">{step.text}</p>
      <div className="space-y-2">
        {step.lines.map((l, i) =>
          l.who === "kind" ? (
            <div key={i} className="flex justify-start">
              <p className="max-w-[85%] rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-sm">
                <span className="block text-[10px] font-semibold uppercase text-muted-foreground">Kind</span>
                {l.text}
              </p>
            </div>
          ) : (
            <div key={i} className="flex flex-col items-end gap-1">
              <button
                onClick={() => l.why && toggle(i)}
                aria-expanded={l.why ? open.has(i) : undefined}
                className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-left text-sm text-primary-foreground"
              >
                <span className="block text-[10px] font-semibold uppercase opacity-80">Ouder {l.why ? "· tik voor uitleg" : ""}</span>
                {l.text}
              </button>
              {l.why && open.has(i) && (
                <p className="max-w-[85%] rounded-2xl bg-[#e3f6e8] px-3 py-2 text-xs text-[#1d5a2c]">💡 {l.why}</p>
              )}
            </div>
          ),
        )}
      </div>
      {open.size > 0 && open.size === tips && (
        <p className="rounded-2xl bg-secondary p-3 text-sm text-secondary-foreground">
          Je hebt alle uitleg gezien. Probeer het gesprek eens hardop te oefenen, met je eigen woorden.
        </p>
      )}
    </section>
  );
}

function Cheatsheet({ guide, plan }: { guide: Guide; plan: string }) {
  const share = async () => {
    const text = cheatsheetText(guide, plan);
    try {
      if (navigator.share) {
        await navigator.share({ title: guide.title, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success("Gekopieerd. Plak het in je notities of stuur het naar je partner.");
    } catch {
      // Sharing was cancelled; nothing to do.
    }
  };
  return (
    <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
      <p className="text-3xl">🎉</p>
      <h2 className="text-lg">Klaar! Jouw spiekbriefje</h2>
      <p className="text-sm text-muted-foreground">De kern in vijf zinnen. Bewaar het, zodat je het bij de hand hebt als het moment komt.</p>
      <ol className="list-decimal space-y-2 pl-5 text-sm">
        {guide.cheatsheet.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ol>
      {plan && (
        <p className="rounded-2xl bg-primary/10 p-3 text-sm">
          <b>Jouw plan voor deze week:</b> {plan}
        </p>
      )}
      <button onClick={() => void share()} className="w-full rounded-full border px-4 py-2.5 text-sm font-semibold">
        📤 Deel of bewaar je spiekbriefje
      </button>
      {plan && <p className="text-xs text-muted-foreground">Over twee dagen vragen we hoe het ging met je plan.</p>}
    </section>
  );
}
