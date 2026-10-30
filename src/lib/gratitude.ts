/** A note from the jar, never the same one twice in a row. `rand` is between 0 and 1. */
export function shakeJar<T extends { id: string }>(
  notes: T[],
  lastId: string | null,
  rand: number,
) {
  const pool = notes.length > 1 ? notes.filter((n) => n.id !== lastId) : notes;
  if (!pool.length) return null;
  return pool[Math.min(pool.length - 1, Math.floor(rand * pool.length))]!;
}

export const GRATITUDE_PROMPTS = [
  "Wat maakte je vandaag aan het lachen?",
  "Wie was er lief voor je?",
  "Waar ben je trots op?",
  "Wat was lekker vandaag?",
  "Welk klein ding ging goed?",
  "Waar keek je naar uit?",
  "Wat vond je mooi om te zien?",
];
export const promptFor = (day: string) =>
  GRATITUDE_PROMPTS[Number(day.replace(/-/g, "")) % GRATITUDE_PROMPTS.length]!;
