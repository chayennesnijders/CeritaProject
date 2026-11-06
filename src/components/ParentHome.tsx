import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Riti } from "@/components/Riti";
import { ThemeDayCard } from "@/components/ThemeDayCard";
import { celebrate } from "@/lib/celebrate";
import { MOODS, dutchHour, greeting, moodById, type MoodId } from "@/lib/home";
import { PARENT_HELP, parentDay } from "@/lib/parent";

type CheckKind = "zelf" | "kind";

/** Home screen for parents and carers: their own small assignment, a tip for their child, and calm. */
export function ParentHome({
  uid,
  day,
  name,
  corner = false,
}: {
  uid: string;
  day: string;
  name: string;
  corner?: boolean;
}) {
  const qc = useQueryClient();
  const hi = greeting(dutchHour());
  const today = parentDay(day);
  const weekAgo = new Date(new Date(day).getTime() - 6 * 86_400_000).toISOString().slice(0, 10);

  const { data } = useQuery({
    queryKey: ["parent-home", uid, day],
    queryFn: async () => {
      const [checks, mood] = await Promise.all([
        supabase.from("parent_checks").select("day, kind").eq("user_id", uid).gte("day", weekAgo),
        supabase
          .from("mood_entries")
          .select("mood")
          .eq("user_id", uid)
          .eq("day", day)
          .maybeSingle(),
      ]);
      return { checks: checks.data ?? [], mood: (mood.data?.mood as MoodId | undefined) ?? null };
    },
  });
  const done = (kind: CheckKind) => !!data?.checks.some((c) => c.day === day && c.kind === kind);
  const weekCount = data?.checks.length ?? 0;
  const refresh = () => qc.invalidateQueries({ queryKey: ["parent-home", uid, day] });

  async function toggle(kind: CheckKind) {
    const { error } = done(kind)
      ? await supabase
          .from("parent_checks")
          .delete()
          .eq("user_id", uid)
          .eq("day", day)
          .eq("kind", kind)
      : await supabase.from("parent_checks").insert({ user_id: uid, day, kind });
    if (error) {
      toast.error("Opslaan lukte niet. Heb je update-49 al in Supabase gedraaid?");
      return;
    }
    if (!done(kind)) celebrate("klein", { set: "hartjes" });
    refresh();
  }
  async function setMood(id: MoodId) {
    const { error } = await supabase.from("mood_entries").upsert({ user_id: uid, day, mood: id });
    if (error) {
      toast.error("Opslaan lukte niet.");
      return;
    }
    refresh();
  }
  const mood = moodById(data?.mood ?? null);

  return (
    <div className="space-y-5 pt-2">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-primary">
          {corner ? "Jouw ouderhoek" : "CeritaProject voor ouders"}
        </p>
        <h1 className="text-3xl">
          {corner ? (
            "Voor jou als ouder 💛"
          ) : (
            <>
              {hi.text}
              {name ? `, ${name}` : ""} {hi.emoji}
            </>
          )}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Goed voor jezelf zorgen is ook goed zorgen voor je kind.
        </p>
      </div>

      <ThemeDayCard day={day} audience="ouders" />

      <Task
        emoji="🌿"
        label="Voor jezelf vandaag"
        text={today.self}
        done={done("zelf")}
        onToggle={() => void toggle("zelf")}
      />
      <Task
        emoji="💛"
        label="Voor je kind vandaag"
        text={today.child}
        done={done("kind")}
        onToggle={() => void toggle("kind")}
      />
      {weekCount > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Deze week {weekCount === 1 ? "1 keer" : `${weekCount} keer`} gedaan. Wat goed van je.
        </p>
      )}

      {!corner && (
        <>
          <section className="rounded-3xl bg-card p-4 shadow-soft">
            <div className="flex items-center gap-2">
              <Riti size={70} expression={mood ? "blij" : "neutraal"} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Hoe voel jij je vandaag?</p>
                <p className="text-xs text-muted-foreground">Alleen jij ziet je antwoord.</p>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-5 gap-1">
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => void setMood(m.id)}
                  className={`flex flex-col items-center rounded-2xl py-2 transition-transform active:scale-90 ${data?.mood === m.id ? "bg-secondary" : "hover:bg-muted"}`}
                >
                  <span className="text-2xl">{m.emoji}</span>
                  <span className="mt-1 text-[11px] font-semibold">{m.label}</span>
                </button>
              ))}
            </div>
            <Link
              to="/stemming"
              className="mt-2 block text-center text-xs font-semibold text-primary"
            >
              📅 Mijn stemmingskalender →
            </Link>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <Link to="/rust" className="rounded-3xl bg-card p-4 text-center shadow-soft">
              <span className="block text-2xl">🫧</span>
              <span className="block text-sm font-semibold">Rustmoment</span>
              <span className="block text-[11px] text-muted-foreground">2 minuten ademen</span>
            </Link>
            <Link to="/dankbaar" className="rounded-3xl bg-card p-4 text-center shadow-soft">
              <span className="block text-2xl">🫙</span>
              <span className="block text-sm font-semibold">Dankbaar potje</span>
              <span className="block text-[11px] text-muted-foreground">Wat ging er goed?</span>
            </Link>
          </div>
        </>
      )}

      <section className="space-y-2 rounded-3xl bg-secondary p-4 text-secondary-foreground">
        <p className="font-semibold">Binnenkort voor ouders</p>
        <p className="text-sm">
          📖 Elke dag een echt verhaal van een jongere, met wat jij ermee kunt.
        </p>
        <p className="text-sm">
          📘 Handleidingen, bijvoorbeeld: hoe begin je het gesprek als je je zorgen maakt?
        </p>
      </section>

      <section className="space-y-2 rounded-3xl bg-card p-4 text-sm shadow-soft">
        <p className="font-semibold">Hulp voor jou als ouder</p>
        {PARENT_HELP.map((h) => (
          <p key={h.name}>
            <b>{h.name}</b>
            {h.phone ? (
              <>
                {" "}
                · <span className="select-all">{h.phone}</span>
              </>
            ) : null}
            <span className="block text-xs text-muted-foreground">{h.what}</span>
          </p>
        ))}
        <p className="pt-1 text-xs text-muted-foreground">Bij direct gevaar: bel 112.</p>
      </section>
    </div>
  );
}

function Task({
  emoji,
  label,
  text,
  done,
  onToggle,
}: {
  emoji: string;
  label: string;
  text: string;
  done: boolean;
  onToggle: () => void;
}) {
  return (
    <section
      className={`rounded-3xl p-4 shadow-soft transition-colors ${done ? "bg-[#e5f4e4] dark:bg-[#1f3a2c]" : "bg-card"}`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
        {emoji} {label}
      </p>
      <p className="mt-1">{text}</p>
      <button
        onClick={onToggle}
        aria-pressed={done}
        className={`mt-3 rounded-full px-4 py-1.5 text-sm font-semibold transition-transform active:scale-95 ${done ? "bg-[#2d6a4f] text-white" : "bg-primary text-primary-foreground"}`}
      >
        {done ? "✓ Gedaan" : "Gedaan"}
      </button>
    </section>
  );
}
