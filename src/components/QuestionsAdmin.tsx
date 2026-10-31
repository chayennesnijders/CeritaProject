import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { bandLabel } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Answer anonymous questions (coaches on /coach, admins in Beheer → Vragen). Only the asker sees the
 * answer, and nobody here sees who asked.
 */
export function QuestionsAdmin() {
  const qc = useQueryClient();
  const [show, setShow] = useState<"open" | "klaar">("open");
  const [drafts, setDrafts] = useState<Record<string, { text: string }>>({});
  const { data: rows = [] } = useQuery({
    queryKey: ["admin-questions"],
    queryFn: async () => (await supabase.rpc("coach_questions")).data ?? [],
  });
  const list = rows.filter((q) => (show === "open" ? q.status === "nieuw" : q.status !== "nieuw"));
  const draft = (id: string) => drafts[id] ?? { text: "" };

  async function answer(id: string, decline = false) {
    const d = draft(id);
    const { error } = await supabase.rpc("answer_question", {
      _question: id,
      _answer: decline ? "" : d.text,
      // There is no question wall any more: answers are only for the one who asked.
      _publish: false,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(decline ? "Niet beantwoord" : "Beantwoord 💛");
    qc.invalidateQueries({ queryKey: ["admin-questions"] });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Je ziet niet wie de vraag stelde. Klinkt een vraag zorgwekkend? Dan staat hij ook bij Inbox
        → Zorgsignalen.
      </p>
      <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
        {(["open", "klaar"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setShow(t)}
            className={`rounded-full py-2 text-sm font-semibold ${show === t ? "bg-card shadow-soft" : ""}`}
          >
            {t === "open"
              ? `Open (${rows.filter((q) => q.status === "nieuw").length})`
              : "Afgehandeld"}
          </button>
        ))}
      </div>
      {list.length === 0 && <p className="text-sm text-muted-foreground">Niets hier.</p>}
      {list.map((q) => (
        <article key={q.id} className="space-y-2 rounded-3xl bg-card p-4 shadow-soft">
          <p className="text-xs text-muted-foreground">
            {bandLabel(q.age_group)} ·{" "}
            {new Date(q.created_at).toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" })}
          </p>
          <p className="font-semibold">❓ {q.body}</p>
          {q.status === "nieuw" ? (
            <>
              <Textarea
                value={draft(q.id).text}
                maxLength={3000}
                rows={4}
                onChange={(e) =>
                  setDrafts({ ...drafts, [q.id]: { ...draft(q.id), text: e.target.value } })
                }
                placeholder="Jouw antwoord…"
                className="rounded-2xl"
              />
              <p className="text-[11px] text-muted-foreground">
                Alleen de vrager ziet je antwoord.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-full"
                  onClick={() => answer(q.id, true)}
                >
                  Niet beantwoorden
                </Button>
                <Button
                  disabled={!draft(q.id).text.trim()}
                  className="flex-1 rounded-full"
                  onClick={() => answer(q.id)}
                >
                  Antwoord sturen
                </Button>
              </div>
            </>
          ) : q.status === "beantwoord" ? (
            <p className="whitespace-pre-wrap rounded-2xl bg-secondary p-3 text-sm text-secondary-foreground">
              💬 {q.answer}
              <span className="mt-1 block text-[11px] opacity-75">
                {q.answered_by_name ?? "Beheer"}
              </span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Niet beantwoord.</p>
          )}
        </article>
      ))}
    </div>
  );
}
