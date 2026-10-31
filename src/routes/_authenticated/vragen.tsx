import { createFileRoute } from "@tanstack/react-router";
import { TalkToCoach } from "@/components/TalkToCoach";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { needsCare, showCareHelp } from "@/lib/care";

export const Route = createFileRoute("/_authenticated/vragen")({
  head: () => ({
    meta: [
      { title: "Coaches — CeritaProject" },
      {
        name: "description",
        content: "Chat met een coach of stel anoniem een vraag.",
      },
    ],
  }),
  component: QuestionsPage,
});

/** Chat with a coach, or ask one anything anonymously; only the asker sees the answer. */
function QuestionsPage() {
  const { data: me } = useMe();
  const uid = me?.user.id;
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: mine = [] } = useQuery({
    queryKey: ["my-questions", uid],
    enabled: !!uid,
    queryFn: async () =>
      (
        await supabase
          .from("anon_questions")
          .select("id, body, status, answer, published, answer_seen, answered_by, created_at")
          .eq("user_id", uid!)
          .order("created_at", { ascending: false })
      ).data ?? [],
  });
  const { data: coaches = [] } = useQuery({
    queryKey: ["coaches-public"],
    queryFn: async () =>
      (
        await supabase
          .from("coaches")
          .select("user_id, title")
          .eq("active", true)
          .order("created_at")
      ).data ?? [],
  });
  const coachName = (id: string | null) => coaches.find((c) => c.user_id === id)?.title ?? null;
  const unseen = mine.filter((q) => q.status === "beantwoord" && !q.answer_seen).length;
  // Opening "Mijn vragen" marks new answers as seen.
  useEffect(() => {
    if (!uid || !unseen) return;
    void supabase
      .from("anon_questions")
      .update({ answer_seen: true })
      .eq("user_id", uid)
      .eq("answer_seen", false)
      .then(() => qc.invalidateQueries({ queryKey: ["my-questions", uid] }));
  }, [uid, unseen, qc]);

  async function ask() {
    setBusy(true);
    const { error } = await supabase.rpc("ask_question", { _body: body });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (needsCare(body)) showCareHelp();
    toast.success("Je vraag is verstuurd. Je krijgt antwoord bij 'Mijn vragen'.");
    setBody("");
    qc.invalidateQueries({ queryKey: ["my-questions", uid] });
  }

  return (
    <div className="space-y-4 pt-2">
      <div>
        <h1 className="text-3xl">🎓 Coaches</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Je kunt altijd terecht bij een coach. Chat met een coach, of stel hieronder anoniem een
          vraag: dan ziet niemand van wie hij komt, ook de coach niet.
        </p>
      </div>
      <TalkToCoach />
      <p className="pt-1 font-semibold">❓ Of stel anoniem een vraag</p>
      <section className="space-y-2 rounded-3xl bg-card p-4 shadow-soft">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={600}
          rows={4}
          placeholder="Bijvoorbeeld: Hoe zeg ik tegen mijn ouders dat ik me niet goed voel?"
          className="rounded-2xl"
        />
        <Button
          disabled={busy || body.trim().length < 5}
          onClick={ask}
          className="w-full rounded-full"
        >
          {busy ? "Even geduld…" : "Vraag anoniem aan een coach"}
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Alleen jij ziet het antwoord. Heb je nu meteen hulp nodig? Bel 113 (0800-0113) of de
          Kindertelefoon (0800-0432).
        </p>
      </section>
      <p className="pt-1 font-semibold">
        Mijn vragen {unseen ? `· 🔴 ${unseen} nieuw antwoord` : ""}
      </p>
      {mine.length === 0 ? (
        <p className="text-sm text-muted-foreground">Je hebt nog geen vragen gesteld.</p>
      ) : (
        mine.map((q) => (
          <article key={q.id} className="space-y-2 rounded-3xl bg-card p-4 shadow-soft">
            <p className="text-sm">{q.body}</p>
            {q.status === "beantwoord" ? (
              <p className="whitespace-pre-wrap rounded-2xl bg-secondary p-3 text-sm text-secondary-foreground">
                💬 {q.answer}
                {coachName(q.answered_by) && (
                  <span className="mt-1 block text-[11px] font-semibold opacity-80">
                    — {coachName(q.answered_by)}
                  </span>
                )}
              </p>
            ) : q.status === "afgewezen" ? (
              <p className="text-xs text-muted-foreground">
                Deze vraag is bekeken, maar niet beantwoord.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">⏳ Wacht op antwoord</p>
            )}
          </article>
        ))
      )}
    </div>
  );
}
