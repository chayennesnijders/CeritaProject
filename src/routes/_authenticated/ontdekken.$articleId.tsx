import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { categoryLabel, photoInParagraph, useArticleImage } from "@/lib/articles";
import { useMe } from "@/lib/auth";
import { kindInfo, NO_REACTIONS, ofKind, REACTIONS, readingMinutes, relatedStories } from "@/lib/discover";
import { useDiscover, useStoryActions } from "@/lib/use-discover";

export const Route = createFileRoute("/_authenticated/ontdekken/$articleId")({
  head: () => ({
    meta: [
      { title: "Verhaal — CeritaProject" },
      { name: "description", content: "Lees een verhaal of tips uit CeritaProject." },
      { property: "og:title", content: "Verhaal — CeritaProject" },
      { property: "og:description", content: "Lees een verhaal of tips uit CeritaProject." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ArticlePage,
});

function ArticlePage() {
  const { articleId } = Route.useParams();
  const { data: article, isLoading } = useQuery({
    queryKey: ["article", articleId],
    queryFn: async () => (await supabase.from("articles").select("*").eq("id", articleId).maybeSingle()).data,
  });
  const { data: imageSrc } = useArticleImage(article?.image_url);
  const { data: me } = useMe();
  const uid = me?.user.id;
  const { stories, counts, saved, read, reacted } = useDiscover(uid);
  const actions = useStoryActions(uid);
  // Opening a story marks it as read (for the ✓ and the "Nog niet gelezen" filter).
  const markRead = actions.markRead;
  useEffect(() => { if (article?.id && uid) markRead(article.id); }, [article?.id, uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const k = kindInfo(article?.kind ?? "verhaal");
  const back = k.tab === "artikelen" ? { soort: "artikelen" as const } : {};
  const related = article ? relatedStories(article, ofKind(stories, k.kind), read) : [];

  if (isLoading) return <p className="pt-6 text-sm text-muted-foreground">Laden…</p>;
  if (!article)
    return (
      <div className="pt-6">
        <p className="text-sm text-muted-foreground">Dit verhaal of artikel is er niet (meer).</p>
        <Link to="/ontdekken" className="mt-3 inline-block rounded-full bg-secondary px-4 py-2 text-sm text-secondary-foreground">
          Terug naar Ontdekken
        </Link>
      </div>
    );

  return (
    <article className="pt-2">
      <Link to="/ontdekken" search={back} className="text-sm text-primary underline">
        Terug naar {k.label}
      </Link>
      {imageSrc ? (
        <img src={imageSrc} alt="" className="mt-4 w-full rounded-3xl object-cover" />
      ) : (
        <p className="mt-4 text-4xl">{article.emoji}</p>
      )}
      <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="mr-2 rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">{k.emoji} {k.one}</span>
        {categoryLabel(article.category)}
      </p>
      <h1 className="mt-1 text-3xl">{article.title}</h1>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{new Date(article.created_at).toLocaleDateString("nl-NL")} · ⏱️ {readingMinutes(article.body)} min lezen</p>
        <button onClick={() => actions.toggleSave(article.id, saved.has(article.id))} aria-pressed={saved.has(article.id)}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${saved.has(article.id) ? "bg-primary text-primary-foreground" : "bg-card shadow-soft"}`}>
          {saved.has(article.id) ? "⭐ Bewaard" : "☆ Bewaren"}
        </button>
      </div>
      {k.kind === "verhaal" && SENSITIVE.has(article.category) && (
        <div className="mt-4 rounded-2xl bg-secondary p-4 text-sm text-secondary-foreground">
          💛 Dit is een echt verhaal van een jongere en het kan over moeilijke dingen gaan. Lees in je eigen tempo en stop wanneer je wilt.
          Raakt het je? Praat erover met iemand die je vertrouwt, of bel gratis de Kindertelefoon (0800-0432) of 113 (0800-0113).
        </div>
      )}
      <div className="mt-4 space-y-4 text-[15px] leading-relaxed">
        {article.body.split("\n\n").map((p, i) => {
          const photo = photoInParagraph(p);
          return photo ? <StoryPhoto key={i} path={photo} /> : <p key={i} className="whitespace-pre-line">{p}</p>;
        })}
      </div>
      <section className="mt-8 rounded-3xl bg-card p-5 text-center shadow-soft">
        <p className="font-semibold">{k.kind === "verhaal" ? "Hoe raakt dit verhaal je?" : "Wat vond je van dit artikel?"}</p>
        <p className="text-xs text-muted-foreground">Iedereen ziet hoeveel reacties er zijn, maar niemand ziet van wie.</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {REACTIONS.map((r) => {
            const on = reacted.has(`${article.id}:${r.kind}`);
            const n = (counts.get(article.id) ?? NO_REACTIONS)[r.kind];
            return (
              <button key={r.kind} onClick={() => actions.toggleReaction(article.id, r.kind, on)} aria-pressed={on}
                className={`flex flex-col items-center rounded-2xl px-2 py-3 transition-all active:scale-90 ${on ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <span className={`text-2xl transition-transform ${on ? "scale-125" : ""}`}>{r.emoji}</span>
                <span className="mt-1 text-xs font-semibold">{r.label}</span>
                <span className="text-xs opacity-80">{n}</span>
              </button>
            );
          })}
        </div>
      </section>
      {related.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg">📚 Lees ook</h2>
          <div className="mt-2 space-y-2">
            {related.map((s) => (
              <Link key={s.id} to="/ontdekken/$articleId" params={{ articleId: s.id }} className="flex items-center justify-between gap-3 rounded-2xl bg-card p-3 shadow-soft">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{s.title}</span>
                  <span className="text-[11px] text-muted-foreground">⏱️ {readingMinutes(s.body)} min{read.has(s.id) ? " · ✓ Gelezen" : ""}</span>
                </span>
                <span className="shrink-0 text-primary">→</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <div className="mt-6 flex flex-col gap-2">
        <Link to="/ontdekken" search={back} className="rounded-full bg-secondary px-4 py-2.5 text-center text-sm font-semibold text-secondary-foreground">
          Meer {k.many} lezen
        </Link>
        <Link to="/verhaal-insturen" className="rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground">
          Deel jouw verhaal
        </Link>
      </div>
    </article>
  );
}

// Stories about hard experiences get a gentle note with where to find help.
const SENSITIVE = new Set(["overkomen", "in-je-hoofd"]);

function StoryPhoto({ path }: { path: string }) {
  const { data: src } = useArticleImage(path);
  return src ? <img src={src} alt="" loading="lazy" className="w-full rounded-3xl object-cover" /> : null;
}
