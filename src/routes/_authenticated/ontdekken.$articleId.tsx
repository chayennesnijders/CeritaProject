import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { categoryLabel, useArticleImage } from "@/lib/articles";

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

  if (isLoading) return <p className="pt-6 text-sm text-muted-foreground">Laden…</p>;
  if (!article)
    return (
      <div className="pt-6">
        <p className="text-sm text-muted-foreground">Dit verhaal is er niet (meer).</p>
        <Link to="/ontdekken" className="mt-3 inline-block rounded-full bg-secondary px-4 py-2 text-sm text-secondary-foreground">
          Terug naar Ontdekken
        </Link>
      </div>
    );

  return (
    <article className="pt-2">
      <Link to="/ontdekken" className="text-sm text-primary underline">
        Terug naar Ontdekken
      </Link>
      {imageSrc ? (
        <img src={imageSrc} alt="" className="mt-4 w-full rounded-3xl object-cover" />
      ) : (
        <p className="mt-4 text-4xl">{article.emoji}</p>
      )}
      <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{categoryLabel(article.category)}</p>
      <h1 className="mt-1 text-3xl">{article.title}</h1>
      <p className="mt-2 text-xs text-muted-foreground">{new Date(article.created_at).toLocaleDateString("nl-NL")}</p>
      <div className="mt-4 space-y-4 text-[15px] leading-relaxed">
        {article.body.split("\n\n").map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-2">
        <Link to="/ontdekken" className="rounded-full bg-secondary px-4 py-2.5 text-center text-sm font-semibold text-secondary-foreground">
          Meer verhalen lezen
        </Link>
        <Link to="/verhaal-insturen" className="rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground">
          Deel jouw verhaal
        </Link>
      </div>
    </article>
  );
}
