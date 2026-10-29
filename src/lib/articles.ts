import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Artikel categorieën: onderwerpen waar verhalen en tips over gaan. */
export const ARTICLE_CATEGORIES = ["familie", "vriendschap", "inspiratie"] as const;

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

export const categoryLabel = (c: string) =>
  c === "vriendschap" ? "Vriendschap" : c === "inspiratie" ? "Inspiratie" : "Familie";

/** Korte samenvatting voor in de lijst: eerste alinea, gekapt op 110 tekens. */
export const excerpt = (body: string) => {
  const first = body.split("\n\n")[0] ?? "";
  return first.length > 110 ? `${first.slice(0, 110).trimEnd()}…` : first;
};

/** Foto's uit besloten opslag; dit maakt een tijdelijke kijk-link (1 uur geldig). */
export function useSignedImage(bucket: string, path: string | null | undefined) {
  return useQuery({
    queryKey: ["signed-image", bucket, path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path!, 3600);
      if (error) return null;
      return data.signedUrl;
    },
  });
}

/** Artikelfoto's staan in een besloten opslag. */
export function useArticleImage(path: string | null | undefined) {
  return useSignedImage("article-images", path);
}
