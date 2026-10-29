/** Story board columns, in order. Members only see "gepland" (and "verschenen" for 14 days). */
export const STORY_COLUMNS = [
  { id: "idee", label: "Idee", emoji: "💡" },
  { id: "schrijven", label: "Schrijven", emoji: "✍️" },
  { id: "klaar", label: "Klaar", emoji: "✅" },
  { id: "gepland", label: "Gepland", emoji: "📅" },
] as const;
export type StoryStatus = (typeof STORY_COLUMNS)[number]["id"] | "verschenen";

/** The column left (-1) or right (+1) of this one, or null at the edge. */
export function moveStatus(status: StoryStatus, dir: -1 | 1): StoryStatus | null {
  const i = STORY_COLUMNS.findIndex((c) => c.id === status);
  if (i < 0) return null;
  return STORY_COLUMNS[i + dir]?.id ?? null;
}

/** "Vandaag", "Morgen", "Over 3 dagen" or a date like "di 5 nov"; empty without a date. */
export function plannedLabel(date: string | null, today: string) {
  if (!date) return "";
  const days = Math.round(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000,
  );
  if (days < 0) return "Komt eraan";
  if (days === 0) return "Vandaag";
  if (days === 1) return "Morgen";
  if (days <= 6) return `Over ${days} dagen`;
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/Amsterdam",
  });
}

/** The planned story with the most hearts (at least one) gets a 🔥; ties go to the earliest in the list. */
export function favouriteId(stories: { id: string; status: string; votes: number }[]) {
  let best: { id: string; votes: number } | null = null;
  for (const s of stories)
    if (s.status === "gepland" && s.votes > 0 && (!best || s.votes > best.votes)) best = s;
  return best?.id ?? null;
}
