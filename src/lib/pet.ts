export const PET_SPECIES = [
  { id: "kat", emoji: "🐱", label: "Kat" },
  { id: "hond", emoji: "🐶", label: "Hond" },
  { id: "konijn", emoji: "🐰", label: "Konijn" },
  { id: "draak", emoji: "🐲", label: "Draakje" },
  { id: "beer", emoji: "🐻", label: "Beertje" },
  { id: "panda", emoji: "🐼", label: "Panda" },
] as const;

export const CARE_ACTIONS = [
  { id: "eten", emoji: "🍓", label: "Eten geven" },
  { id: "spelen", emoji: "🎾", label: "Spelen" },
  { id: "knuffel", emoji: "🤗", label: "Knuffelen" },
] as const;

export const XP_PER_LEVEL = 50;

/** Level never goes down: it only depends on total XP, which only grows. */
export function levelFor(xp: number) {
  const level = Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1;
  const progress = (Math.max(0, xp) % XP_PER_LEVEL) / XP_PER_LEVEL;
  return { level, progress };
}

/** Mood is never negative: skipping a day just means the pet is resting. */
export function moodFor(caredToday: number) {
  if (caredToday >= 3) return "Superblij! 💖";
  if (caredToday >= 1) return "Blij 😊";
  return "Rust lekker uit 😴";
}

export function speciesEmoji(id: string) {
  return PET_SPECIES.find((s) => s.id === id)?.emoji ?? "🐾";
}

export type Unlockable = { id: string; label: string; emoji: string; level: number };

export const BACKGROUNDS: (Unlockable & { css: string })[] = [
  { id: "kamer", label: "Kamer", emoji: "🛋️", level: 1, css: "linear-gradient(180deg,#7a4a3a,#4a2c22)" },
  { id: "tuin", label: "Tuin", emoji: "🌷", level: 2, css: "linear-gradient(180deg,#bfe3f5,#9fd38a)" },
  { id: "strand", label: "Strand", emoji: "🏖️", level: 3, css: "linear-gradient(180deg,#8fd3f4,#f6dfa8)" },
  { id: "snoep", label: "Snoepland", emoji: "🍭", level: 4, css: "linear-gradient(180deg,#fbc7d9,#f7e1ef)" },
  { id: "sterren", label: "Sterrennacht", emoji: "🌙", level: 5, css: "linear-gradient(180deg,#1f2347,#4b3b78)" },
  { id: "sneeuw", label: "Sneeuw", emoji: "❄️", level: 7, css: "linear-gradient(180deg,#dbeaf5,#ffffff)" },
];


export const OUTFITS: Unlockable[] = [
  { id: "geen", label: "Niks", emoji: "🚫", level: 1 },
  { id: "strik", label: "Strikje", emoji: "🎀", level: 2 },
  { id: "pet", label: "Petje", emoji: "🧢", level: 3 },
  { id: "bril", label: "Zonnebril", emoji: "🕶️", level: 4 },
  { id: "sjaal", label: "Sjaal", emoji: "🧣", level: 5 },
  { id: "kroon", label: "Kroontje", emoji: "👑", level: 6 },
];

export const HOUSES: Unlockable[] = [
  { id: "geen", label: "Niks", emoji: "🚫", level: 1 },
  { id: "mand", label: "Mandje", emoji: "🧺", level: 2 },
  { id: "tent", label: "Tentje", emoji: "⛺", level: 4 },
  { id: "huis", label: "Huisje", emoji: "🏡", level: 6 },
  { id: "kasteel", label: "Kasteel", emoji: "🏰", level: 8 },
];

export const isUnlocked = (item: Unlockable, level: number) => level >= item.level;

/** Items that became available exactly at this level (for the level-up message). */
export function unlocksAt(level: number) {
  return [...BACKGROUNDS, ...OUTFITS, ...HOUSES].filter((i) => i.level === level);
}

/** Extra pets you may collect: one more every 2 levels (level 3, 5, 7, ...). */
export const extraPetSlots = (level: number) => Math.max(0, Math.floor((level - 1) / 2));

/** Pet day starts at 07:00 Amsterdam time: before 07:00 it's still "yesterday". Returns YYYY-MM-DD. */
export function petDay(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() - 7 * 3600 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" }).format(shifted);
}

/** Care unlocks once the member has filled in at least one task for today. */
export const careUnlocked = (todayTaskCount: number) => todayTaskCount > 0;

/** Per toestel onthouden dat het dagtaken-popupje voor dit diertje al langs is geweest. */
export const todoPopupKey = (petRef: string, day: string) => `cerita-todo-popup-${petRef}-${day}`;

/** Het popupje popt vanzelf op: alleen als er vandaag nog niets ingevuld is en het nog niet getoond was. */
export const shouldAutoOpenTodoPopup = (todayTaskCount: number, alreadyShown: boolean) =>
  todayTaskCount === 0 && !alreadyShown;
