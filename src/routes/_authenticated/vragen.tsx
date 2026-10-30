import { createFileRoute } from "@tanstack/react-router";
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
      { title: "Vraag een coach — CeritaProject" },
      {
        name: "description",
        content: "Stel anoniem een vraag aan een coach en lees antwoorden op vragen van anderen.",
      },
    ],
  }),
  component: QuestionsPage,
});

/** Ask the admins anything anonymously; answered questions can go on the wall of your age band. */
function QuestionsPage() {
  const { data: me } = useMe();
  const uid = me?.user.id;
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"muur" | "mijn">("muur");

  const { data: wall = [] } = useQuery({
    queryKey: ["question-wall", uid],
    enabled: !!uid,
    queryFn: async () => (await supabase.rpc("question_wall")).data ?? [],
  });
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
    if (tab !== "mijn" || !uid || !unseen) return;
    void supabase
      .from("anon_questions")
      .update({ answer_seen: true })
      .eq("user_id", uid)
      .eq("answer_seen", false)
      .then(() => qc.invalidateQueries({ queryKey: ["my-questions", uid] }));
  }, [tab, uid, unseen, qc]);

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
    setTab("mijn");
    qc.invalidateQueries({ queryKey: ["my-questions", uid] });
  }

  return (
    <div className="space-y-4 pt-2">
      <div>
        <h1 className="text-3xl">🧑‍🏫 Vraag een coach</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stel anoniem een vraag die je liever niet hardop stelt. Een coach van CeritaProject geeft
          antwoord. Niemand ziet van wie de vraag komt, ook de coach niet.
        </p>
        {coaches.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {coaches.map((c) => (
              <span
                key={c.user_id}
                className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground"
              >
                🧑‍🏫 {c.title}
              </span>
            ))}
          </div>
        )}
      </div>
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
          Mooie vragen met antwoord kunnen anoniem op de vragenmuur komen, zodat anderen er ook iets
          aan hebben. Heb je nu meteen hulp nodig? Bel 113 (0800-0113) of de Kindertelefoon
          (0800-0432).
        </p>
      </section>
      <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
        <button
          onClick={() => setTab("muur")}
          className={`rounded-full py-2 text-sm font-semibold ${tab === "muur" ? "bg-card shadow-soft" : ""}`}
        >
          Vragenmuur ({wall.length})
        </button>
        <button
          onClick={() => setTab("mijn")}
          className={`rounded-full py-2 text-sm font-semibold ${tab === "mijn" ? "bg-card shadow-soft" : ""}`}
        >
          Mijn vragen {unseen ? `🔴 ${unseen}` : `(${mine.length})`}
        </button>
      </div>
      {tab === "muur" ? (
        wall.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nog geen vragen op de muur.</p>
        ) : (
          wall.map((q) => (
            <article key={q.id} className="space-y-2 rounded-3xl bg-card p-4 shadow-soft">
              <p className="font-semibold">❓ {q.body}</p>
              <p className="whitespace-pre-wrap rounded-2xl bg-secondary p-3 text-sm text-secondary-foreground">
                💬 {q.answer}
                {q.coach && (
                  <span className="mt-1 block text-[11px] font-semibold opacity-80">
                    — {q.coach}
                  </span>
                )}
              </p>
            </article>
          ))
        )
      ) : mine.length === 0 ? (
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
                {q.published && (
                  <span className="mt-1 block text-[11px] opacity-75">
                    Staat anoniem op de vragenmuur.
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
