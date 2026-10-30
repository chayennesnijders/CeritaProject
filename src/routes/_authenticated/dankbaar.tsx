import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { challengeDay } from "@/lib/challenges";
import { promptFor, shakeJar } from "@/lib/gratitude";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/dankbaar")({
  head: () => ({
    meta: [
      { title: "Dankbaarheidspotje — CeritaProject" },
      {
        name: "description",
        content: "Schrijf elke dag een lichtpuntje op en lees ze terug als je het nodig hebt.",
      },
    ],
  }),
  component: JarPage,
});

/** Write down one good thing a day; shake the jar to read an old one back on a hard day. */
function JarPage() {
  const { data: me } = useMe();
  const uid = me?.user.id;
  const qc = useQueryClient();
  const today = challengeDay();
  const [text, setText] = useState("");
  const [shown, setShown] = useState<{ id: string; body: string; created_at: string } | null>(null);
  const [shaking, setShaking] = useState(false);

  const { data: notes = [] } = useQuery({
    queryKey: ["gratitude", uid],
    enabled: !!uid,
    queryFn: async () =>
      (
        await supabase
          .from("gratitude_notes")
          .select("id, body, created_at")
          .eq("user_id", uid!)
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  async function add() {
    if (!uid || !text.trim()) return;
    const { error } = await supabase
      .from("gratitude_notes")
      .insert({ user_id: uid, body: text.trim() });
    if (error) {
      toast.error("Bewaren lukte niet.");
      return;
    }
    setText("");
    toast.success("In het potje! ✨");
    qc.invalidateQueries({ queryKey: ["gratitude", uid] });
  }
  function shake() {
    setShaking(true);
    navigator.vibrate?.([20, 40, 20]);
    setTimeout(() => {
      setShaking(false);
      setShown(shakeJar(notes, shown?.id ?? null, Math.random()));
    }, 700);
  }

  const fill = Math.min(100, notes.length * 4);
  return (
    <div className="space-y-4 pt-2">
      <div>
        <h1 className="text-2xl">🫙 Dankbaarheidspotje</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Schrijf elke dag één ding op waar je blij mee bent. Op een moeilijke dag schud je het
          potje en lees je een oud lichtpuntje terug. Alleen jij ziet dit.
        </p>
      </div>
      <section className="space-y-2 rounded-3xl bg-card p-4 shadow-soft">
        <p className="text-sm font-semibold">{promptFor(today)}</p>
        <div className="flex gap-2">
          <Input
            value={text}
            maxLength={200}
            onChange={(e) => setText(e.target.value)}
            placeholder="Bijvoorbeeld: lekker gelachen met Sanne"
            className="rounded-2xl"
          />
          <Button disabled={!text.trim()} onClick={add} className="rounded-full">
            ✨
          </Button>
        </div>
      </section>

      <section className="flex flex-col items-center rounded-3xl bg-card p-5 shadow-soft">
        <button
          onClick={notes.length ? shake : undefined}
          aria-label="Schud het potje"
          className={`relative h-44 w-32 overflow-hidden rounded-b-[2.5rem] rounded-t-2xl border-4 border-[#c9b8a6] bg-white/60 ${shaking ? "animate-[riti-rock_0.35s_ease-in-out_2]" : ""}`}
        >
          <span className="absolute inset-x-0 -top-1 h-4 rounded-t-xl bg-[#c9b8a6]" />
          <span
            className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#f5c518] to-[#fde2e4] transition-all"
            style={{ height: `${fill}%` }}
          />
          <span className="absolute inset-0 flex flex-wrap content-end justify-center gap-1 p-3 text-lg">
            {notes.slice(0, 20).map((n) => (
              <span key={n.id}>⭐</span>
            ))}
          </span>
        </button>
        <p className="mt-3 text-sm text-muted-foreground">
          {notes.length} {notes.length === 1 ? "lichtpuntje" : "lichtpuntjes"} in je potje
        </p>
        {notes.length > 0 && (
          <Button variant="outline" className="mt-2 rounded-full" onClick={shake}>
            🫙 Schud het potje
          </Button>
        )}
        {shown && !shaking && (
          <div className="mt-4 w-full rounded-2xl bg-[#fff1c1] p-4 text-center text-[#2a1a14] animate-in zoom-in-95">
            <p className="text-lg font-semibold">“{shown.body}”</p>
            <p className="mt-1 text-xs opacity-70">
              {new Date(shown.created_at).toLocaleDateString("nl-NL", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
