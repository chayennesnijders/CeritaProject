import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { challengeDay } from "@/lib/challenges";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { daysUntil, LETTER_MONTHS, letterWaitText } from "@/lib/letters";
import { needsCare, showCareHelp } from "@/lib/care";

export const Route = createFileRoute("/_authenticated/brieven")({
  head: () => ({
    meta: [
      { title: "Brief aan jezelf — CeritaProject" },
      { name: "description", content: "Schrijf een brief aan jezelf die je pas later mag openen." },
    ],
  }),
  component: LettersPage,
});

/** Letters to your future self: sealed until the chosen day, then you get a push. */
function LettersPage() {
  const { data: me } = useMe();
  const uid = me?.user.id;
  const qc = useQueryClient();
  const today = challengeDay();
  const [body, setBody] = useState("");
  const [months, setMonths] = useState<number>(3);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState<string | null>(null);

  const { data: letters = [] } = useQuery({
    queryKey: ["letters", uid],
    enabled: !!uid,
    queryFn: async () => (await supabase.rpc("my_letters")).data ?? [],
  });

  async function send() {
    setBusy(true);
    const { error } = await supabase.rpc("write_letter", { _body: body, _months: months });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (needsCare(body)) showCareHelp();
    toast.success("Je brief is verzegeld 💌");
    setBody("");
    qc.invalidateQueries({ queryKey: ["letters", uid] });
  }
  async function open(id: string) {
    setReading(reading === id ? null : id);
    await supabase.rpc("open_letter", { _letter: id });
  }

  return (
    <div className="space-y-4 pt-2">
      <div>
        <h1 className="text-3xl">💌 Brief aan jezelf</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Schrijf een brief aan jezelf in de toekomst. Hij gaat dicht en je mag hem pas openen op de
          dag die je kiest. Alleen jij kunt hem lezen.
        </p>
      </div>

      <section className="space-y-3 rounded-3xl bg-card p-4 shadow-soft">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={5000}
          rows={7}
          placeholder="Lieve ik van later… Hoe gaat het nu met je? Waar ben je trots op? Wat hoop je?"
          className="rounded-2xl"
        />
        <p className="text-sm font-semibold">Wanneer mag hij open?</p>
        <div className="grid grid-cols-4 gap-2">
          {LETTER_MONTHS.map((m) => (
            <Button
              key={m}
              variant={months === m ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setMonths(m)}
            >
              {m === 12 ? "1 jaar" : `${m} mnd`}
            </Button>
          ))}
        </div>
        <Button disabled={busy || !body.trim()} onClick={send} className="h-12 w-full rounded-full">
          {busy ? "Even geduld…" : "💌 Brief verzegelen"}
        </Button>
        <p className="text-xs text-muted-foreground">Je krijgt een melding als hij open mag.</p>
      </section>

      {letters.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xl">Mijn brieven</h2>
          {letters.map((l) => {
            const canOpen = daysUntil(l.open_at, today) <= 0 && l.body;
            return (
              <div
                key={l.id}
                className={`rounded-3xl p-4 shadow-soft ${canOpen ? "bg-[#fde2e4] text-[#2a1a14]" : "bg-card"}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{canOpen ? (l.opened_at ? "📖" : "💌") : "🔒"}</span>
                  <div className="flex-1">
                    <p className="font-semibold">
                      Geschreven op{" "}
                      {new Date(l.created_at).toLocaleDateString("nl-NL", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-xs opacity-75">{letterWaitText(l.open_at, today)}</p>
                  </div>
                  {canOpen && (
                    <Button size="sm" className="rounded-full" onClick={() => open(l.id)}>
                      {reading === l.id ? "Dicht" : "Openen"}
                    </Button>
                  )}
                </div>
                {reading === l.id && l.body && (
                  <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-white/70 p-3 text-sm animate-in fade-in">
                    {l.body}
                  </p>
                )}
              </div>
            );
          })}
        </section>
      )}
      <Link to="/dagboek" className="block text-center text-sm text-primary underline">
        ← Naar mijn dagboek
      </Link>
    </div>
  );
}
