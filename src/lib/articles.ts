import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Artikel categorieën: dezelfde onderwerpen als op de WordPress-site. */
const CATEGORY_LABELS = {
  "in-je-hoofd": "In je hoofd",
  overkomen: "Dingen die je zijn overkomen",
  relaties: "Relaties & mensen",
  "jong-zijn": "Jong zijn",
  "leven-daarna": "Het leven daarna",
} as const;
// Oudere categorieën houden hun naam, maar je kunt ze niet meer kiezen.
const OLD_LABELS: Record<string, string> = { familie: "Familie", vriendschap: "Vriendschap", inspiratie: "Inspiratie" };
export const ARTICLE_CATEGORIES = Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[];

export type ArticleCategory = keyof typeof CATEGORY_LABELS;

export const categoryLabel = (c: string) => CATEGORY_LABELS[c as ArticleCategory] ?? OLD_LABELS[c] ?? "Overig";

/** An emoji per category, for the category buttons in Ontdekken. */
export const categoryEmoji = (c: string) =>
  ({ "in-je-hoofd": "🧠", overkomen: "🌧️", relaties: "💞", "jong-zijn": "🎒", "leven-daarna": "🌱" })[c] ?? "📖";

/** A paragraph that is only "[[foto:…]]" is a photo between the text (a storage path or a web address). */
export const photoInParagraph = (p: string) => /^\[\[foto:(.+)\]\]$/.exec(p.trim())?.[1] ?? null;

/** Korte samenvatting voor in de lijst: eerste alinea, gekapt op 110 tekens. */
export const excerpt = (body: string) => {
  // Skip photos and short lines such as "Anoniem, 18 jaar" so the preview shows real text.
  const paragraphs = body.split("\n\n").filter((p) => !photoInParagraph(p));
  const first = (paragraphs.find((p) => p.trim().length >= 40) ?? paragraphs[0] ?? "").replace(
    /\n/g,
    " ",
  );
  return first.length > 110 ? `${first.slice(0, 110).trimEnd()}…` : first;
};

/** Foto's uit besloten opslag; dit maakt een tijdelijke kijk-link (1 uur geldig). */
export function useSignedImage(bucket: string, path: string | null | undefined) {
  return useQuery({
    queryKey: ["signed-image", bucket, path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      // Web addresses (e.g. a photo still on WordPress) are used as they are.
      if (/^https?:\/\//.test(path!)) return path!;
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
