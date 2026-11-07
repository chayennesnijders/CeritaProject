import { PET_GAMES } from "./pet-games";

export const PET_SPECIES = [
  { id: "kat", emoji: "🐱", label: "Kat" },
  { id: "hond", emoji: "🐶", label: "Hond" },
  { id: "konijn", emoji: "🐰", label: "Konijn" },
  { id: "draak", emoji: "🐲", label: "Draakje" },
  { id: "beer", emoji: "🐻", label: "Beertje" },
  { id: "panda", emoji: "🐼", label: "Panda" },
  { id: "vos", emoji: "🦊", label: "Vosje" },
  { id: "muis", emoji: "🐭", label: "Muisje" },
  { id: "hamster", emoji: "🐹", label: "Hamster" },
  { id: "eenhoorn", emoji: "🦄", label: "Eenhoorn" },
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
  {
    id: "kamer",
    label: "Kamer",
    emoji: "🛋️",
    level: 1,
    css: "linear-gradient(180deg,#7a4a3a,#4a2c22)",
  },
  {
    id: "tuin",
    label: "Tuin",
    emoji: "🌷",
    level: 2,
    css: "linear-gradient(180deg,#bfe3f5,#9fd38a)",
  },
  {
    id: "strand",
    label: "Strand",
    emoji: "🏖️",
    level: 3,
    css: "linear-gradient(180deg,#8fd3f4,#f6dfa8)",
  },
  {
    id: "snoep",
    label: "Snoepland",
    emoji: "🍭",
    level: 4,
    css: "linear-gradient(180deg,#fbc7d9,#f7e1ef)",
  },
  {
    id: "sterren",
    label: "Sterrennacht",
    emoji: "🌙",
    level: 5,
    css: "linear-gradient(180deg,#1f2347,#4b3b78)",
  },
  {
    id: "sneeuw",
    label: "Sneeuw",
    emoji: "❄️",
    level: 7,
    css: "linear-gradient(180deg,#dbeaf5,#ffffff)",
  },
];

export const OUTFITS: Unlockable[] = [
  { id: "geen", label: "Niks", emoji: "🚫", level: 1 },
  { id: "strik", label: "Strikje", emoji: "🎀", level: 2 },
  { id: "pet", label: "Petje", emoji: "🧢", level: 3 },
  { id: "bril", label: "Zonnebril", emoji: "🕶️", level: 4 },
  { id: "sjaal", label: "Sjaal", emoji: "🧣", level: 5 },
  { id: "kroon", label: "Kroontje", emoji: "👑", level: 6 },
];

/** Colours for your pet ("eigen" = the species' own colour). Four free, the rest come with levels. */
export const PET_COLORS: (Unlockable & { body: string | null; belly: string | null })[] = [
  { id: "eigen", label: "Eigen kleur", emoji: "🐾", level: 1, body: null, belly: null },
  { id: "roze", label: "Roze", emoji: "🌸", level: 1, body: "#F7B6CF", belly: "#FDE7F0" },
  { id: "blauw", label: "Hemelsblauw", emoji: "🩵", level: 1, body: "#9CCBF0", belly: "#E3F2FD" },
  { id: "lila", label: "Lila", emoji: "💜", level: 1, body: "#C7AEEA", belly: "#F0E8FB" },
  { id: "mint", label: "Mint", emoji: "🌿", level: 2, body: "#A8E0C4", belly: "#E6F7EE" },
  { id: "geel", label: "Zonnig", emoji: "🌻", level: 3, body: "#F7D774", belly: "#FDF4D3" },
  { id: "nacht", label: "Nacht", emoji: "🌙", level: 4, body: "#4B5A8A", belly: "#9AA6CC" },
  { id: "goud", label: "Goud", emoji: "✨", level: 6, body: "#E2B653", belly: "#F8E7B5" },
];

/**
 * Every new pet brings new things: pet 1 (your first) uses OUTFITS and PET_COLORS, pet 2 and pet 3
 * each have their own outfits and colours, and after that the sets take turns again.
 */
type PetColor = Unlockable & { body: string | null; belly: string | null };
const EIGEN: PetColor = PET_COLORS[0]!;
const GEEN: Unlockable = OUTFITS[0]!;
export const OUTFIT_SETS: Unlockable[][] = [
  OUTFITS,
  [
    GEEN,
    { id: "bloemen", label: "Bloemenkrans", emoji: "🌼", level: 2 },
    { id: "koptelefoon", label: "Koptelefoon", emoji: "🎧", level: 3 },
    { id: "cape", label: "Cape", emoji: "🦸", level: 4 },
    { id: "vlinder", label: "Vlinderdas", emoji: "🦋", level: 5 },
    { id: "ster", label: "Sterrenspeld", emoji: "⭐", level: 6 },
  ],
  [
    GEEN,
    { id: "bandana", label: "Bandana", emoji: "🧡", level: 2 },
    { id: "muts", label: "Muts", emoji: "🧶", level: 3 },
    { id: "hoed", label: "Hoge hoed", emoji: "🎩", level: 4 },
    { id: "ketting", label: "Parelketting", emoji: "📿", level: 5 },
    { id: "tiara", label: "Tiara", emoji: "💎", level: 6 },
  ],
];
export const COLOR_SETS: PetColor[][] = [
  PET_COLORS,
  [
    EIGEN,
    { id: "perzik", label: "Perzik", emoji: "🍑", level: 1, body: "#F9C4A0", belly: "#FEEADB" },
    { id: "aqua", label: "Aqua", emoji: "💧", level: 1, body: "#8EDBD9", belly: "#DFF6F5" },
    { id: "koraal", label: "Koraal", emoji: "🪸", level: 1, body: "#F49A8C", belly: "#FDE2DD" },
    { id: "bos", label: "Bosgroen", emoji: "🌲", level: 2, body: "#7FB08A", belly: "#D7EBDB" },
    { id: "bes", label: "Bes", emoji: "🫐", level: 3, body: "#8F7AC9", belly: "#E1DAF3" },
    { id: "oceaan", label: "Oceaan", emoji: "🌊", level: 4, body: "#4F8FC4", belly: "#CFE3F3" },
    { id: "zilver", label: "Zilver", emoji: "🪙", level: 6, body: "#C9CED6", belly: "#F1F3F6" },
  ],
  [
    EIGEN,
    { id: "citroen", label: "Citroen", emoji: "🍋", level: 1, body: "#F5E27A", belly: "#FDF8D8" },
    { id: "pistache", label: "Pistache", emoji: "🥝", level: 1, body: "#C4DE95", belly: "#EEF6E0" },
    { id: "poeder", label: "Poederroze", emoji: "🎀", level: 1, body: "#EBC3CF", belly: "#FAEDF1" },
    { id: "kers", label: "Kers", emoji: "🍒", level: 2, body: "#D9636E", belly: "#F6D3D6" },
    { id: "turquoise", label: "Turquoise", emoji: "🐚", level: 3, body: "#45B7B0", belly: "#CDEEEB" },
    { id: "chocolade", label: "Chocolade", emoji: "🍫", level: 4, body: "#8A5A44", belly: "#E2CBBE" },
    { id: "parel", label: "Parel", emoji: "🫧", level: 6, body: "#EDE6F2", belly: "#FFFFFF" },
  ],
];

/** Which set a pet uses: 0 for your first pet, then 1, 2, 0, 1, … for the extra pets in order. */
export const petSet = (slot: number) => ((slot % OUTFIT_SETS.length) + OUTFIT_SETS.length) % OUTFIT_SETS.length;
export const outfitsFor = (slot: number) => OUTFIT_SETS[petSet(slot)]!;
export const colorsFor = (slot: number) => COLOR_SETS[petSet(slot)]!;
const ALL_COLORS = COLOR_SETS.flat();

/** What a pet unlocks at a level (its own outfits and colours, plus the shared backgrounds and games). */
export function unlocksFor(slot: number, level: number) {
  return [...BACKGROUNDS, ...outfitsFor(slot), ...colorsFor(slot), ...PET_GAMES].filter((i) => i.level === level);
}

export type PetLook = { body: string; belly: string; ear: string };
/** The species' own look, with the chosen colour on top (ears and paws keep their own colour). */
export function colouredLook(base: PetLook, colorId: string | null | undefined): PetLook {
  const c = ALL_COLORS.find((x) => x.id === colorId);
  if (!c || !c.body || !c.belly) return base;
  return { ...base, body: c.body, belly: c.belly };
}

export const isUnlocked = (item: Unlockable, level: number) => level >= item.level;

/** Items that became available exactly at this level (for the level-up message). */
export function unlocksAt(level: number) {
  return [...BACKGROUNDS, ...OUTFITS, ...PET_COLORS, ...PET_GAMES].filter((i) => i.level === level);
}

/** Extra pets you may collect: one more every 2 levels (level 3, 5, 7, ...). */
export const extraPetSlots = (level: number) => Math.max(0, Math.floor((level - 1) / 2));

/** Pet day starts at 07:00 Amsterdam time: before 07:00 it's still "yesterday". Returns YYYY-MM-DD. */
export function petDay(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() - 7 * 3600 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(shifted);
}

/** Care unlocks once the member has filled in at least one task for today. */
export const careUnlocked = (todayTaskCount: number) => todayTaskCount > 0;

/** Per toestel onthouden dat het dagtaken-popupje voor dit diertje al langs is geweest. */
export const todoPopupKey = (petRef: string, day: string) => `cerita-todo-popup-${petRef}-${day}`;

/** Het popupje popt vanzelf op: alleen als er vandaag nog niets ingevuld is en het nog niet getoond was. */
export const shouldAutoOpenTodoPopup = (todayTaskCount: number, alreadyShown: boolean) =>
  todayTaskCount === 0 && !alreadyShown;
