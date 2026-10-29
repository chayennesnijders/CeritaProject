import { photoInParagraph } from "@/lib/articles";

/** Supportive reactions under a story: members only see how many, never who. */
export const REACTIONS = [
  { kind: "herkenbaar", emoji: "💛", label: "Herkenbaar" },
  { kind: "knuffel", emoji: "🤗", label: "Knuffel" },
  { kind: "sterk", emoji: "💪", label: "Sterk van je" },
] as const;
export type ReactionKind = (typeof REACTIONS)[number]["kind"];
export type ReactionCounts = Record<ReactionKind, number>;
export const NO_REACTIONS: ReactionCounts = { herkenbaar: 0, knuffel: 0, sterk: 0 };

export type StoryCard = {
  id: string;
  title: string;
  body: string;
  category: string;
  created_at: string;
};

/** About 200 words a minute, at least one minute; photos don't count. */
export function readingMinutes(body: string) {
  const words = body
    .split("\n\n")
    .filter((p) => !photoInParagraph(p))
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Same story for everyone on a given (Dutch) day, a different one the next day. */
export function storyOfTheDay<T extends { id: string }>(stories: T[], day: string): T | null {
  if (stories.length === 0) return null;
  const sorted = [...stories].sort((a, b) => a.id.localeCompare(b.id));
  const n = Math.round(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
  return sorted[((n % sorted.length) + sorted.length) % sorted.length]!;
}

/** Number of stories per category, only categories that have stories, most first. */
export function categoryCounts(stories: { category: string }[]) {
  const counts = new Map<string, number>();
  for (const s of stories) counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count }));
}

export type StoryFilter = {
  query: string;
  category: string | null;
  onlySaved: boolean;
  onlyUnread: boolean;
};

export function filterStories<T extends StoryCard>(
  stories: T[],
  f: StoryFilter,
  saved: Set<string>,
  read: Set<string>,
) {
  const q = f.query.trim().toLowerCase();
  return stories.filter(
    (s) =>
      (!f.category || s.category === f.category) &&
      (!f.onlySaved || saved.has(s.id)) &&
      (!f.onlyUnread || !read.has(s.id)) &&
      (!q || s.title.toLowerCase().includes(q) || s.body.toLowerCase().includes(q)),
  );
}

export const totalReactions = (c: ReactionCounts | undefined) =>
  c ? c.herkenbaar + c.knuffel + c.sterk : 0;

/** Newest first, or most reactions first (newest breaks ties). */
export function sortStories<T extends StoryCard>(
  stories: T[],
  by: "nieuw" | "herkend",
  counts: Map<string, ReactionCounts>,
) {
  const newest = (a: T, b: T) => b.created_at.localeCompare(a.created_at);
  return [...stories].sort(
    by === "nieuw"
      ? newest
      : (a, b) =>
          totalReactions(counts.get(b.id)) - totalReactions(counts.get(a.id)) || newest(a, b),
  );
}

/** Up to three other stories from the same category, unread ones first. */
export function relatedStories<T extends StoryCard>(story: T, all: T[], read: Set<string>) {
  return all
    .filter((s) => s.id !== story.id && s.category === story.category)
    .sort(
      (a, b) =>
        Number(read.has(a.id)) - Number(read.has(b.id)) || b.created_at.localeCompare(a.created_at),
    )
    .slice(0, 3);
}
