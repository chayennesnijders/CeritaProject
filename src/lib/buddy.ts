/** Interests to find a buddy with (max 8 each, same limit as the database). */
export const INTERESTS = [
  { id: "gamen", emoji: "🎮", label: "Gamen" },
  { id: "muziek", emoji: "🎵", label: "Muziek" },
  { id: "tekenen", emoji: "🎨", label: "Tekenen" },
  { id: "lezen", emoji: "📚", label: "Lezen" },
  { id: "sport", emoji: "⚽", label: "Sport" },
  { id: "dansen", emoji: "💃", label: "Dansen" },
  { id: "dieren", emoji: "🐶", label: "Dieren" },
  { id: "films", emoji: "🎬", label: "Films & series" },
  { id: "koken", emoji: "🍰", label: "Koken & bakken" },
  { id: "natuur", emoji: "🌿", label: "Natuur" },
  { id: "mode", emoji: "👗", label: "Mode" },
  { id: "schrijven", emoji: "✍️", label: "Schrijven" },
  { id: "anime", emoji: "🌸", label: "Anime" },
  { id: "fotografie", emoji: "📷", label: "Fotografie" },
  { id: "school", emoji: "📝", label: "Samen huiswerk" },
  { id: "praten", emoji: "💬", label: "Gewoon kletsen" },
] as const;
export const MAX_INTERESTS = 8;
export const interestById = (id: string) => INTERESTS.find((i) => i.id === id) ?? null;

/** Adds or removes an interest, never more than the maximum. */
export function toggleInterest(list: string[], id: string) {
  if (list.includes(id)) return list.filter((x) => x !== id);
  return list.length >= MAX_INTERESTS ? list : [...list, id];
}
