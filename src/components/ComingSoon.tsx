import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { challengeDay } from "@/lib/challenges";
import { favouriteId, plannedLabel } from "@/lib/story-board";

type BoardStory = {
  id: string;
  title: string;
  teaser: string | null;
  emoji: string;
  status: string;
  planned_date: string | null;
  votes: number;
  voted: boolean;
  article_id: string | null;
};

/** "Binnenkort" on Ontdekken: upcoming stories members can give a heart; just-published ones link to the story. */
export function ComingSoon() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [pop, setPop] = useState<string | null>(null);
  const today = challengeDay();
  const { data = [] } = useQuery({
    queryKey: ["story-board"],
    queryFn: async () => ((await supabase.rpc("story_board")).data ?? []) as BoardStory[],
  });
  // Admins get the whole planning board from story_board(); here only what members see.
  const stories = data
    .filter((s) => s.status === "gepland" || s.status === "verschenen")
    .sort((a, b) => Number(b.status === "verschenen") - Number(a.status === "verschenen"));
  const fav = favouriteId(stories);
  if (stories.length === 0) return null;

  async function toggle(s: BoardStory) {
    const uid = me?.user.id;
    if (!uid) return;
    // Show the change right away; the server answer follows.
    qc.setQueryData<BoardStory[]>(["story-board"], (old) =>
      old?.map((x) =>
        x.id === s.id ? { ...x, voted: !s.voted, votes: x.votes + (s.voted ? -1 : 1) } : x,
      ),
    );
    if (!s.voted) {
      setPop(s.id);
      setTimeout(() => setPop(null), 500);
    }
    const { error } = s.voted
      ? await supabase.from("story_votes").delete().eq("plan_id", s.id).eq("user_id", uid)
      : await supabase.from("story_votes").insert({ plan_id: s.id, user_id: uid });
    if (error) toast.error("Dat lukte niet, probeer het opnieuw.");
    qc.invalidateQueries({ queryKey: ["story-board"] });
  }

  return (
    <section className="mt-5">
      <h2 className="text-xl">Binnenkort 📅</h2>
      <p className="text-xs text-muted-foreground">
        Geef een hartje aan het verhaal dat jij het liefst wilt lezen. Je krijgt een melding als het
        er is!
      </p>
      <div className="-mx-5 mt-3 flex snap-x gap-3 overflow-x-auto px-5 pb-2">
        {stories.map((s) => (
          <article
            key={s.id}
            className="relative flex w-60 shrink-0 snap-start flex-col rounded-3xl bg-warm p-4 text-blush shadow-soft"
          >
            {s.id === fav && (
              <span className="absolute right-3 top-3 rounded-full bg-background/90 px-2 py-0.5 text-xs font-semibold text-foreground">
                🔥 Favoriet
              </span>
            )}
            <span className="text-4xl">{s.emoji}</span>
            <p className="mt-2 font-display text-lg leading-snug">{s.title}</p>
            {s.teaser && <p className="mt-1 text-xs opacity-85">{s.teaser}</p>}
            <div className="mt-auto pt-3">
              {s.status === "verschenen" ? (
                s.article_id ? (
                  <Link
                    to="/ontdekken/$articleId"
                    params={{ articleId: s.article_id }}
                    className="inline-block rounded-full bg-background px-3 py-1.5 text-sm font-semibold text-foreground"
                  >
                    Nu te lezen →
                  </Link>
                ) : (
                  <span className="inline-block rounded-full bg-background/80 px-3 py-1.5 text-sm font-semibold text-foreground">
                    Net verschenen 🎉
                  </span>
                )
              ) : (
                <div className="flex items-center justify-between gap-2">
                  {s.planned_date ? (
                    <span className="rounded-full bg-background/80 px-2 py-0.5 text-xs font-semibold text-foreground">
                      {plannedLabel(s.planned_date, today)}
                    </span>
                  ) : (
                    <span />
                  )}
                  <button
                    onClick={() => toggle(s)}
                    aria-pressed={s.voted}
                    aria-label={s.voted ? "Hartje weghalen" : "Hartje geven"}
                    className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold transition-transform ${s.voted ? "bg-background text-foreground" : "bg-background/30"} ${pop === s.id ? "scale-125" : ""}`}
                  >
                    {s.voted ? "❤️" : "🤍"} {s.votes}
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
