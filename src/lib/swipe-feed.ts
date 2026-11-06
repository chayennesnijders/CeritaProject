import { photoInParagraph } from "@/lib/articles";

/** Stories about hard experiences get a gentle note with where to find help. */
export const SENSITIVE_CATEGORIES = new Set(["overkomen", "in-je-hoofd"]);

/** After this many stories the feed offers a short pause (no endless scrolling on autopilot). */
export const PAUSE_EVERY = 8;

/**
 * Order for the swipe feed: the chosen story first, then the ones not read yet (newest first,
 * as given), then the ones already read. Computed once when the feed opens, so reading a story
 * never reshuffles the cards under your thumb.
 */
export function swipeOrder<T extends { id: string }>(stories: T[], read: Set<string>, startId?: string | null): T[] {
  const start = startId ? stories.find((s) => s.id === startId) : undefined;
  const rest = stories.filter((s) => s !== start);
  return [...(start ? [start] : []), ...rest.filter((s) => !read.has(s.id)), ...rest.filter((s) => read.has(s.id))];
}

export type FeedSlide<T> = { type: "story"; story: T; n: number } | { type: "pauze"; seen: number } | { type: "einde" };

/** The slides: stories with a pause card after every PAUSE_EVERY stories, and an end card. */
export function feedSlides<T>(stories: T[]): FeedSlide<T>[] {
  const out: FeedSlide<T>[] = [];
  stories.forEach((story, i) => {
    if (i > 0 && i % PAUSE_EVERY === 0) out.push({ type: "pauze", seen: i });
    out.push({ type: "story", story, n: i });
  });
  if (stories.length) out.push({ type: "einde" });
  return out;
}

/** The opening of a story for its card: whole sentences, up to about 280 characters. */
export function storyHook(body: string, max = 280): string {
  const text = body
    .split("\n\n")
    .filter((p) => !photoInParagraph(p) && p.trim().length >= 40)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  const sentences = text.match(/[^.!?…]+[.!?…]+["’”]?\s*/g) ?? [];
  let out = "";
  for (const s of sentences) {
    if ((out + s).length > max) break;
    out += s;
  }
  out = out.trim();
  return out.length >= 60 ? out : `${text.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

/** True when two taps are close enough together to count as a double tap. */
export const isDoubleTap = (previous: number, now: number) => now - previous > 0 && now - previous < 320;
