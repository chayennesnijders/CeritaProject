/** Greeting that fits the time of day (Dutch time). */
export function greeting(hour: number) {
  if (hour < 6) return { text: "Slaap lekker", emoji: "🌙" };
  if (hour < 12) return { text: "Goedemorgen", emoji: "☀️" };
  if (hour < 18) return { text: "Goedemiddag", emoji: "🌤️" };
  return { text: "Goedenavond", emoji: "🌆" };
}

/** Current hour in the Netherlands. */
export const dutchHour = (now: Date = new Date()) =>
  Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Amsterdam",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );

export type Suggestion = {
  emoji: string;
  label: string;
  to: "/dagboek" | "/diertje" | "/ontdekken" | "/community" | "/vrienden";
};

/** "Hoe voel je je vandaag?": a kind answer and two things that might help. */
export const MOODS = [
  {
    id: "super",
    emoji: "😄",
    label: "Super",
    reply: "Wat fijn dat je je zo goed voelt! Geniet ervan 🌈",
    tips: [
      { emoji: "💬", label: "Deel je goede humeur in de community", to: "/community" },
      { emoji: "📔", label: "Schrijf op wat je blij maakte", to: "/dagboek" },
    ],
  },
  {
    id: "goed",
    emoji: "🙂",
    label: "Goed",
    reply: "Fijn om te horen! Mooi dat je even bij jezelf stilstaat 💛",
    tips: [
      { emoji: "🐾", label: "Zeg hoi tegen je diertje", to: "/diertje" },
      { emoji: "📖", label: "Lees een verhaal", to: "/ontdekken" },
    ],
  },
  {
    id: "gaat-wel",
    emoji: "😐",
    label: "Gaat wel",
    reply: "Niet elke dag hoeft top te zijn. Het is oké om je gewoon 'oké' te voelen.",
    tips: [
      { emoji: "🧠", label: "Speel een breinspelletje", to: "/diertje" },
      { emoji: "📔", label: "Schrijf even wat je bezighoudt", to: "/dagboek" },
    ],
  },
  {
    id: "verdrietig",
    emoji: "😢",
    label: "Verdrietig",
    reply: "Wat naar dat je je verdrietig voelt. Je bent niet alleen, en je gevoel mag er zijn 🤍",
    tips: [
      { emoji: "📖", label: "Lees verhalen van jongeren die het herkennen", to: "/ontdekken" },
      { emoji: "📔", label: "Schrijf het van je af in je dagboek", to: "/dagboek" },
    ],
  },
  {
    id: "gestrest",
    emoji: "😣",
    label: "Gestrest",
    reply: "Even diep ademhalen. Je hoeft niet alles tegelijk op te lossen 🌿",
    tips: [
      { emoji: "🫧", label: "Doe de ademhaling bij je diertje", to: "/diertje" },
      { emoji: "💬", label: "Praat erover in de community", to: "/community" },
    ],
  },
] as const satisfies readonly {
  id: string;
  emoji: string;
  label: string;
  reply: string;
  tips: readonly Suggestion[];
}[];
export type MoodId = (typeof MOODS)[number]["id"];
export const moodById = (id: string | null | undefined) => MOODS.find((m) => m.id === id) ?? null;
/** Show where to get help when someone feels bad. */
export const needsHelpLine = (id: MoodId) => id === "verdrietig" || id === "gestrest";

/** Kind sentences for the "Positief zinnetje" card; one per day, tap for another. */
export const AFFIRMATIONS = [
  "Jij bent genoeg, precies zoals je bent.",
  "Kleine stapjes zijn ook stapjes.",
  "Je gevoelens mogen er zijn.",
  "Je hoeft het niet alleen te doen.",
  "Rust nemen is ook iets doen.",
  "Je bent sterker dan je denkt.",
  "Fouten maken hoort bij leren.",
  "Vandaag mag je lief zijn voor jezelf.",
  "Je verhaal is nog niet af.",
  "Het is oké om hulp te vragen.",
  "Jij doet ertoe.",
  "Na regen komt zonneschijn.",
  "Je hoeft niet perfect te zijn om waardevol te zijn.",
  "Adem in, adem uit. Je bent hier.",
  "Je mag nee zeggen.",
  "Wat anderen denken, bepaalt niet wie jij bent.",
  "Je bent al zo ver gekomen.",
  "Elke dag is een nieuwe kans.",
  "Jouw tempo is goed genoeg.",
  "Je mag trots zijn op jezelf.",
  "Moeilijke dagen gaan ook weer voorbij.",
  "Jij verdient vriendelijkheid, ook van jezelf.",
  "Er is maar één jij, en dat is mooi.",
  "Je mag ruimte innemen.",
  "Huilen is niet zwak, het is menselijk.",
  "Iemand is blij dat jij er bent.",
  "Je hoeft niet alles te weten.",
  "Zorg goed voor jezelf vandaag.",
  "Jouw stem is belangrijk.",
  "Het komt goed, stap voor stap.",
] as const;

/** Same sentence for everyone on a day; `extra` moves on when you tap for another one. */
export function affirmationFor(day: string, extra = 0) {
  const n = Math.round(Date.parse(`${day}T00:00:00Z`) / 86_400_000) + extra;
  return AFFIRMATIONS[((n % AFFIRMATIONS.length) + AFFIRMATIONS.length) % AFFIRMATIONS.length]!;
}
