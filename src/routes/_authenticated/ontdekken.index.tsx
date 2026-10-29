import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ARTICLE_CATEGORIES, categoryLabel, excerpt, useArticleImage } from "@/lib/articles";
import { ComingSoon } from "@/components/ComingSoon";

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

function OntdekkenPage() {
  const { data: articles, isLoading } = useQuery({
    queryKey: ["articles"],
    queryFn: async () =>
      (
        await supabase
          .from("articles")
          .select("id, title, body, emoji, category, created_at, image_url, min_age")
          .eq("is_published", true)
          .order("created_at", { ascending: false })
      ).data ?? [],
  });
  const [filter, setFilter] = useState<string>("alles");
  const shown = (articles ?? []).filter((a) => filter === "alles" || a.category === filter);
  return (
    <div className="pt-2">
      <h1 className="text-3xl">Ontdekken</h1>
      <p className="mt-1 text-sm text-muted-foreground">Verhalen en tips van andere jongeren. Lees in je eigen tempo.</p>
      <ComingSoon />
      <div className="mt-4 flex flex-wrap gap-2">
        {["alles", ...ARTICLE_CATEGORIES].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              filter === c ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground shadow-soft"
            }`}
          >
            {c === "alles" ? "Alles" : categoryLabel(c)}
          </button>
        ))}
      </div>
      <div className="mt-5 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Laden…</p>}
        {shown.map((a) => (
          <Link
            key={a.id}
            to="/ontdekken/$articleId"
            params={{ articleId: a.id }}
            className="flex items-start gap-4 rounded-3xl bg-card p-4 shadow-soft"
          >
            <ArticleThumb emoji={a.emoji} imageUrl={a.image_url} />
            <div className="flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {categoryLabel(a.category)}
                {a.min_age >= 16 && <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">16+</span>}
              </p>
              <p className="mt-0.5 font-semibold">{a.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{excerpt(a.body)}</p>
            </div>
          </Link>
        ))}
        {!isLoading && (articles?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">Nog geen verhalen. Er komen er snel meer.</p>
        )}
        {!isLoading && (articles?.length ?? 0) > 0 && shown.length === 0 && (
          <p className="text-sm text-muted-foreground">Nog geen verhalen in deze categorie.</p>
        )}
      </div>
    </div>
  );
}

function ArticleThumb({ emoji, imageUrl }: { emoji: string; imageUrl: string | null }) {
  const { data: src } = useArticleImage(imageUrl);
  if (src) return <img src={src} alt="" className="size-12 shrink-0 rounded-2xl object-cover" />;
  return <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-2xl">{emoji}</span>;
}
