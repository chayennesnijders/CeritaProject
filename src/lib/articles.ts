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

// ---------- Photo links ----------
// Photos live in private storage and are shown through temporary links. The same link is reused
// (also after closing the app, via localStorage) for as long as it is valid, so the phone keeps
// the photo it already downloaded instead of fetching it again.

/** How long a link stays valid. Story photos may be cached a day; private chat files only an hour. */
const LINK_SECONDS: Record<string, number> = { "article-images": 24 * 3600, avatars: 24 * 3600 };
const linkSeconds = (bucket: string) => LINK_SECONDS[bucket] ?? 3600;
const STORE_KEY = "cerita-fotolinks-v1";
type Stored = Record<string, { url: string; until: number }>;

function readStore(): Stored {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}") as Stored;
  } catch {
    return {};
  }
}
function writeStore(add: Stored) {
  try {
    const now = Date.now();
    const all = { ...readStore(), ...add };
    for (const [k, v] of Object.entries(all)) if (v.until < now) delete all[k];
    localStorage.setItem(STORE_KEY, JSON.stringify(all));
  } catch {
    // No storage (private window): links are simply made again next time.
  }
}
/** A remembered link that is still valid for at least 10 minutes, or null. */
export function rememberedLink(bucket: string, path: string): string | null {
  if (typeof window === "undefined") return null;
  const hit = readStore()[`${bucket}/${path}`];
  return hit && hit.until - Date.now() > 10 * 60_000 ? hit.url : null;
}
function remember(bucket: string, links: { path: string; url: string }[]) {
  const until = Date.now() + linkSeconds(bucket) * 1000;
  writeStore(Object.fromEntries(links.map((l) => [`${bucket}/${l.path}`, { url: l.url, until }])));
}

/**
 * Links asked for at (almost) the same moment are made together in ONE request: a list of 150
 * story cards asks for 150 links at once, which used to be 150 separate requests.
 */
const waiting = new Map<string, Map<string, ((url: string | null) => void)[]>>();
export function signBatched(bucket: string, path: string): Promise<string | null> {
  return new Promise((resolve) => {
    let queue = waiting.get(bucket);
    if (!queue) {
      queue = new Map();
      waiting.set(bucket, queue);
      setTimeout(() => void flush(bucket), 25);
    }
    queue.set(path, [...(queue.get(path) ?? []), resolve]);
  });
}
async function flush(bucket: string) {
  const queue = waiting.get(bucket);
  waiting.delete(bucket);
  if (!queue) return;
  const paths = [...queue.keys()];
  for (let i = 0; i < paths.length; i += 100) {
    const chunk = paths.slice(i, i + 100);
    const { data } = await supabase.storage.from(bucket).createSignedUrls(chunk, linkSeconds(bucket));
    const found = new Map<string, string>();
    for (const d of data ?? []) if (d.path && d.signedUrl && !d.error) found.set(d.path, d.signedUrl);
    remember(bucket, [...found].map(([path, url]) => ({ path, url })));
    for (const p of chunk) for (const done of queue.get(p) ?? []) done(found.get(p) ?? null);
  }
}

/** Foto's uit besloten opslag: een tijdelijke kijk-link, hergebruikt zolang hij geldig is. */
export function useSignedImage(bucket: string, path: string | null | undefined) {
  const web = !!path && /^https?:\/\//.test(path);
  return useQuery({
    queryKey: ["signed-image", bucket, path],
    enabled: !!path,
    // Web addresses (e.g. a photo still on WordPress) are used as they are.
    initialData: () => (path ? (web ? path : (rememberedLink(bucket, path) ?? undefined)) : undefined),
    staleTime: (linkSeconds(bucket) - 15 * 60) * 1000,
    gcTime: (linkSeconds(bucket) - 10 * 60) * 1000,
    queryFn: async () => {
      if (web) return path!;
      const known = rememberedLink(bucket, path!);
      if (known) return known;
      return signBatched(bucket, path!);
    },
  });
}

/** Artikelfoto's staan in een besloten opslag. */
export function useArticleImage(path: string | null | undefined) {
  return useSignedImage("article-images", path);
}
