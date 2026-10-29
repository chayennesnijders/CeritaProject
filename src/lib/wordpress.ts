import type { ArticleCategory } from "@/lib/articles";

/** The WordPress site the stories come from (override with WORDPRESS_SITE_URL). */
export const DEFAULT_WORDPRESS_SITE = "https://ceritaproject.wpcomstaging.com";

/** The part of a WordPress REST post (with _embed) we use. */
export type WpPost = {
  id: number;
  date: string;
  /** UTC time without a zone marker; `date` is the site's local time. */
  date_gmt?: string;
  title: { rendered: string };
  content: { rendered: string };
  _embedded?: {
    "wp:featuredmedia"?: { source_url?: string }[];
    "wp:term"?: { slug: string; taxonomy: string }[][];
  };
};

/** WordPress category slug → app category, in order of preference. */
const CATEGORY_BY_SLUG: Record<string, ArticleCategory> = {
  "het-leven-daarna": "leven-daarna",
  "jong-zijn": "jong-zijn",
  "relaties-mensen": "relaties",
  "dingen-die-je-zijn-overkomen": "overkomen",
  "in-je-hoofd": "in-je-hoofd",
};

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  ndash: "–",
  mdash: "—",
};
export function decodeEntities(s: string) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code =
        e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

const textOf = (html: string) =>
  decodeEntities(html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""))
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .join("\n")
    .trim();

/**
 * Turns post HTML into the app's story text: paragraphs separated by a blank line,
 * line breaks kept, list items with "• ", and every photo as its own "[[foto:N]]"
 * paragraph (N = index into `images`, replaced by the stored path later).
 */
export function htmlToStory(html: string) {
  const images: string[] = [];
  const paragraphs: string[] = [];
  const blocks = /<(p|h[1-6]|li)\b[^>]*>([\s\S]*?)<\/\1>|<img\b[^>]*>/gi;
  for (const m of html.matchAll(blocks)) {
    if (m[0].toLowerCase().startsWith("<img")) {
      const attr = (name: string) => new RegExp(`\\s${name}="([^"]+)"`, "i").exec(m[0])?.[1];
      const url = attr("data-orig-file") ?? attr("src");
      if (!url) continue;
      paragraphs.push(`[[foto:${images.length}]]`);
      images.push(decodeEntities(url));
      continue;
    }
    // A paragraph that itself holds an image is handled by the <img> match.
    if (/<img\b/i.test(m[2]!)) continue;
    const text = textOf(m[2]!);
    if (text) paragraphs.push(m[1]!.toLowerCase() === "li" ? `• ${text}` : text);
  }
  return { body: paragraphs.join("\n\n"), images };
}

/** Converts one WordPress post into an article row plus the photos to copy. */
export function wpPostToArticle(post: WpPost) {
  const { body, images } = htmlToStory(post.content.rendered);
  const slugs = (post._embedded?.["wp:term"] ?? [])
    .flat()
    .filter((t) => t.taxonomy === "category")
    .map((t) => t.slug);
  const category = Object.keys(CATEGORY_BY_SLUG).find((s) => slugs.includes(s));
  return {
    wp_id: post.id,
    title: textOf(post.title.rendered),
    body,
    images,
    cover: post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null,
    category: category ? CATEGORY_BY_SLUG[category]! : ("in-je-hoofd" as ArticleCategory),
    created_at: new Date(post.date_gmt ? `${post.date_gmt}Z` : post.date).toISOString(),
  };
}

/** Puts the stored photo paths into the "[[foto:N]]" placeholders. */
export const fillPhotos = (body: string, paths: string[]) =>
  body
    .replace(/\[\[foto:(\d+)\]\]/g, (m, i: string) =>
      paths[Number(i)] ? `[[foto:${paths[Number(i)]}]]` : "",
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();

/** File extension for a photo URL (jpg when unclear). */
export const photoExt = (url: string) =>
  (/\.(jpe?g|png|gif|webp|heic)(?:\?|$)/i.exec(url)?.[1] ?? "jpg").toLowerCase();

/**
 * Words that point to very heavy topics; an imported story containing one starts as 16+.
 * Admins can change every story afterwards (Beheer → Verhalen), and a re-import keeps their choice.
 */
const HEAVY_TOPICS = [
  "pistool",
  "wapen",
  "messteek",
  "seksueel",
  "misbruik",
  "verkracht",
  "aangerand",
  "aanranding",
  "grensoverschrijd",
  "zelfmoord",
  "suïcid",
  "suicid",
  "zelfbeschadig",
  "overdosis",
  "verslaving",
  "verslaafd",
  "drugs",
  "psychose",
  "anorexia",
  "boulimia",
  "eetstoornis",
  "mishandel",
  "huiselijk geweld",
  "triggerwarning",
  "trigger warning",
];
export function suggestedMinAge(title: string, body: string): 12 | 16 {
  const text = `${title}\n${body}`.toLowerCase();
  return HEAVY_TOPICS.some((w) => text.includes(w)) ? 16 : 12;
}
