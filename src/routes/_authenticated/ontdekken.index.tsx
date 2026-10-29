import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search, X } from "lucide-react";
import { categoryEmoji, categoryLabel, excerpt, useArticleImage } from "@/lib/articles";
import { challengeDay } from "@/lib/challenges";
import { useMe } from "@/lib/auth";
import { ComingSoon } from "@/components/ComingSoon";
import {
  categoryCounts,
  filterStories,
  readingMinutes,
  sortStories,
  storyOfTheDay,
  totalReactions,
  type StoryFilter,
} from "@/lib/discover";
import { useDiscover } from "@/lib/use-discover";

export const Route = createFileRoute("/_authenticated/ontdekken/")({
  head: () => ({
    meta: [
      { title: "Ontdekken — CeritaProject" },
      { name: "description", content: "Lees verhalen en tips van andere jongeren in CeritaProject." },
      { property: "og:title", content: "Ontdekken — CeritaProject" },
      { property: "og:description", content: "Lees verhalen en tips van andere jongeren in CeritaProject." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OntdekkenPage,
});

const NO_FILTER: StoryFilter = { query: "", category: null, onlySaved: false, onlyUnread: false };

function OntdekkenPage() {
  const { data: me } = useMe();
  const nav = useNavigate();
  const { stories, isLoading, counts, saved, read } = useDiscover(me?.user.id);
  const [f, setF] = useState<StoryFilter>(NO_FILTER);
  const [sort, setSort] = useState<"nieuw" | "herkend">("nieuw");
  const today = storyOfTheDay(stories, challengeDay());
  const shown = sortStories(filterStories(stories, f, saved, read), sort, counts);
  const filtering = f.query !== "" || f.category !== null || f.onlySaved || f.onlyUnread;
  const unreadCount = stories.filter((s) => !read.has(s.id)).length;

  function surprise() {
    const pool = stories.filter((s) => !read.has(s.id));
    const list = pool.length ? pool : stories;
    const pick = list[Math.floor(Math.random() * list.length)];
    if (pick) nav({ to: "/ontdekken/$articleId", params: { articleId: pick.id } });
  }
  const chip = (active: boolean) =>
    `shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${active ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground shadow-soft"}`;

  return (
    <div className="pt-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl">Ontdekken</h1>
          <p className="mt-1 text-sm text-muted-foreground">Echte verhalen van jongeren. Lees in je eigen tempo.</p>
        </div>
        <button onClick={surprise} disabled={!stories.length} className="shrink-0 rounded-2xl bg-card px-3 py-2 text-center text-xs font-semibold shadow-soft active:scale-95">
          <span className="block text-2xl">🎲</span>Verras me
        </button>
      </div>

      <label className="mt-4 flex items-center gap-2 rounded-full bg-card px-4 py-2.5 shadow-soft">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input value={f.query} onChange={(e) => setF({ ...f, query: e.target.value })} placeholder="Zoek een verhaal, bijvoorbeeld 'pesten'" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        {f.query && <button aria-label="Zoeken wissen" onClick={() => setF({ ...f, query: "" })}><X className="size-4" /></button>}
      </label>

      {!filtering && today && (
        <Link to="/ontdekken/$articleId" params={{ articleId: today.id }} className="relative mt-5 block overflow-hidden rounded-3xl bg-warm text-blush shadow-soft">
          <HeroImage imageUrl={today.image_url} />
          <div className="relative p-5 pt-32">
            <span className="rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold text-foreground">🌟 Verhaal van de dag</span>
            <p className="mt-3 font-display text-2xl leading-snug text-white drop-shadow">{today.title}</p>
            <p className="mt-1 text-xs text-white/90 drop-shadow">{categoryLabel(today.category)} · ⏱️ {readingMinutes(today.body)} min lezen{read.has(today.id) ? " · ✓ Gelezen" : ""}</p>
          </div>
        </Link>
      )}

      {!filtering && <ComingSoon />}

      <div className="-mx-5 mt-5 flex gap-2 overflow-x-auto px-5 pb-1">
        <button onClick={() => setF({ ...f, category: null, onlySaved: false, onlyUnread: false })} className={chip(!f.category && !f.onlySaved && !f.onlyUnread)}>Alles · {stories.length}</button>
        <button onClick={() => setF({ ...f, onlyUnread: !f.onlyUnread })} className={chip(f.onlyUnread)}>✨ Nog niet gelezen · {unreadCount}</button>
        <button onClick={() => setF({ ...f, onlySaved: !f.onlySaved })} className={chip(f.onlySaved)}>⭐ Bewaard · {saved.size}</button>
      </div>
      <div className="-mx-5 mt-2 flex gap-2 overflow-x-auto px-5 pb-1">
        {categoryCounts(stories).map(({ category, count }) => (
          <button key={category} onClick={() => setF({ ...f, category: f.category === category ? null : category })}
            className={`flex shrink-0 flex-col items-start rounded-2xl px-3 py-2 text-left transition-colors ${f.category === category ? "bg-primary text-primary-foreground" : "bg-card shadow-soft"}`}>
            <span className="text-xl">{categoryEmoji(category)}</span>
            <span className="text-xs font-semibold">{categoryLabel(category)}</span>
            <span className="text-[11px] opacity-70">{count} {count === 1 ? "verhaal" : "verhalen"}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{shown.length} {shown.length === 1 ? "verhaal" : "verhalen"}</span>
        <div className="flex rounded-full bg-card p-0.5 shadow-soft">
          {([["nieuw", "Nieuwste"], ["herkend", "💛 Meest herkend"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setSort(id)} className={`rounded-full px-3 py-1 font-semibold ${sort === id ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{label}</button>
          ))}
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Laden…</p>}
        {shown.map((a) => {
          const hearts = totalReactions(counts.get(a.id));
          return (
            <Link key={a.id} to="/ontdekken/$articleId" params={{ articleId: a.id }} className="flex items-start gap-4 rounded-3xl bg-card p-4 shadow-soft">
              <ArticleThumb emoji={a.emoji} imageUrl={a.image_url} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {categoryLabel(a.category)}
                  {a.min_age >= 16 && <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">16+</span>}
                </p>
                <p className="mt-0.5 font-semibold">{a.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{excerpt(a.body)}</p>
                <p className="mt-2 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                  <span>⏱️ {readingMinutes(a.body)} min</span>
                  {hearts > 0 && <span>💛 {hearts}</span>}
                  {saved.has(a.id) && <span>⭐ Bewaard</span>}
                  {read.has(a.id) && <span className="text-emerald-600">✓ Gelezen</span>}
                </p>
              </div>
            </Link>
          );
        })}
        {!isLoading && stories.length === 0 && <p className="text-sm text-muted-foreground">Nog geen verhalen. Er komen er snel meer.</p>}
        {!isLoading && stories.length > 0 && shown.length === 0 && (
          <div className="rounded-3xl bg-card p-5 text-center text-sm shadow-soft">
            <p className="text-3xl">🔍</p>
            <p className="mt-1">{f.onlySaved ? "Je hebt nog niets bewaard. Tik op ⭐ bij een verhaal." : f.onlyUnread ? "Je hebt alles gelezen! 🎉" : "Geen verhalen gevonden. Probeer een ander woord."}</p>
            <button onClick={() => setF(NO_FILTER)} className="mt-3 text-primary underline">Alles laten zien</button>
          </div>
        )}
      </div>
    </div>
  );
}

function HeroImage({ imageUrl }: { imageUrl: string | null }) {
  const { data: src } = useArticleImage(imageUrl);
  return (
    <>
      {src && <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
    </>
  );
}

function ArticleThumb({ emoji, imageUrl }: { emoji: string; imageUrl: string | null }) {
  const { data: src } = useArticleImage(imageUrl);
  if (src) return <img src={src} alt="" className="size-16 shrink-0 rounded-2xl object-cover" />;
  return <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-secondary text-2xl">{emoji}</span>;
}
