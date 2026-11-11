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

/** Rotating questions; each day starts at a different one and "Andere vraag" moves to the next. */
export const GRATITUDE_PROMPTS = [
  "Waar ben je vandaag dankbaar voor?",
  "Wat maakte je vandaag aan het lachen?",
  "Wie was er vandaag lief voor je?",
  "Waar ben je trots op?",
  "Welk klein ding ging vandaag goed?",
  "Waar keek je vandaag naar uit?",
  "Wat vond je vandaag mooi om te zien?",
  "Welk moment wil je onthouden?",
  "Wie zou je vandaag willen bedanken?",
  "Wat deed je vandaag goed voor jezelf?",
  "Welk geluid, liedje of geur maakte je blij?",
  "Wat lukte er vandaag, ook al was het klein?",
  "Wanneer voelde je je vandaag even rustig?",
  "Wat heb je vandaag geleerd?",
  "Wie of wat gaf je vandaag een fijn gevoel?",
  "Waar ben je blij mee aan jezelf?",
  "Wat was vandaag beter dan je had verwacht?",
  "Welk berichtje of gesprek deed je goed?",
];
const dayNumber = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return Math.floor(Date.UTC(y!, (m ?? 1) - 1, d ?? 1) / 86_400_000);
};
/** The question for a day; `skip` counts how often "Andere vraag" was tapped. */
export const promptFor = (day: string, skip = 0) =>
  GRATITUDE_PROMPTS[(dayNumber(day) + skip) % GRATITUDE_PROMPTS.length]!;
