/**
 * Minigames next to the pet, about your brain and how you feel. One new game opens per level,
 * like clothes and backgrounds. The server (finish_pet_game) gives 5 XP for the first 3 games a day.
 */
export const PET_GAMES = [
  {
    id: "ademen",
    emoji: "🫧",
    label: "Rustig ademen",
    level: 1,
    text: "Houd je vinger op de bel als hij groeit (adem in) en laat los als hij krimpt (adem uit).",
  },
  {
    id: "memory",
    emoji: "🃏",
    label: "Memory",
    level: 2,
    text: "Draai de kaartjes om en zoek de paren. Hoe minder beurten, hoe beter!",
  },
  {
    id: "kleuren",
    emoji: "🎨",
    label: "Kleur of woord?",
    level: 3,
    text: "Tik op de kleur van de letters, niet op wat er staat. Train je focus!",
  },
  {
    id: "gevoelens",
    emoji: "😊",
    label: "Gevoelens raden",
    level: 4,
    text: "Welk gevoel hoort bij dit gezichtje? Alle gevoelens mogen er zijn.",
  },
  {
    id: "lichtjes",
    emoji: "✨",
    label: "Volg de lichtjes",
    level: 5,
    text: "Onthoud de volgorde van de lichtjes en tik ze na. Hij wordt steeds langer!",
  },
  {
    id: "gedachten",
    emoji: "💭",
    label: "Gedachten sorteren",
    level: 6,
    text: "Houd de fijne gedachten en laat de nare los. Je leert ze anders te zien.",
  },
  {
    id: "zoeken",
    emoji: "🔍",
    label: "Zoek de andere",
    level: 7,
    text: "Eén plaatje is net anders. Vind het zo snel als je kunt!",
  },
] as const;
export type PetGameId = (typeof PET_GAMES)[number]["id"];

export const GAMES_WITH_XP_PER_DAY = 3;

const pick = <T>(list: readonly T[], rnd: () => number) => list[Math.floor(rnd() * list.length)]!;

/** Shuffled copy. `rnd` is injectable for tests. */
export function shuffle<T>(list: readonly T[], rnd: () => number = Math.random): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Shuffled memory deck: every emoji twice. */
export const makeMemoryDeck = (emojis: readonly string[], rnd: () => number = Math.random) =>
  shuffle([...emojis, ...emojis], rnd);

/** 100 points for a perfect game (one turn per pair), 5 less for every extra turn, never below 10. */
export function memoryScore(turns: number, pairs: number) {
  return Math.max(10, 100 - Math.max(0, turns - pairs) * 5);
}

/** Breathing: 4 s in, 4 s out. Which phase is it after `ms` milliseconds? */
export const BREATH_MS = 4000;
export const BREATH_ROUNDS = 3;
export const breathPhase = (ms: number): "in" | "uit" =>
  Math.floor(ms / BREATH_MS) % 2 === 0 ? "in" : "uit";

/** Stroop: a colour word written in a (usually) different colour; the answer is the ink. */
export const COLOURS = [
  { id: "rood", word: "ROOD", css: "#e11d48" },
  { id: "blauw", word: "BLAUW", css: "#2563eb" },
  { id: "groen", word: "GROEN", css: "#16a34a" },
  { id: "geel", word: "GEEL", css: "#ca8a04" },
] as const;
export function stroopRound(rnd: () => number = Math.random) {
  const word = pick(COLOURS, rnd);
  const ink =
    rnd() < 0.75
      ? pick(
          COLOURS.filter((c) => c.id !== word.id),
          rnd,
        )
      : word;
  return { word: word.word, ink: ink.id, css: ink.css };
}

/** Feelings: a face, its name and a kind tip. */
export const FEELINGS = [
  { face: "😊", name: "Blij", tip: "Fijn! Wat maakt jou blij? Schrijf het eens op in je dagboek." },
  { face: "😢", name: "Verdrietig", tip: "Huilen mag. Praat erover met iemand die je vertrouwt." },
  {
    face: "😠",
    name: "Boos",
    tip: "Boos zijn mag. Een paar keer diep ademhalen helpt om rustig te worden.",
  },
  { face: "😨", name: "Bang", tip: "Bang zijn is normaal. Je hoeft het niet alleen te doen." },
  { face: "😴", name: "Moe", tip: "Rust is belangrijk. Goed slapen helpt je brein." },
  { face: "😳", name: "Verlegen", tip: "Iedereen is weleens verlegen. Kleine stapjes helpen." },
  { face: "🤩", name: "Enthousiast", tip: "Leuk! Deel je enthousiasme met iemand anders." },
  { face: "😌", name: "Rustig", tip: "Lekker! Onthoud wat jou rustig maakt." },
  {
    face: "😟",
    name: "Bezorgd",
    tip: "Zorgen opschrijven kan helpen. Ze worden dan vaak kleiner.",
  },
  {
    face: "😤",
    name: "Gefrustreerd",
    tip: "Lukt iets niet? Neem even pauze en probeer het later opnieuw.",
  },
  { face: "🥰", name: "Liefdevol", tip: "Wat fijn dat je om iemand geeft!" },
  { face: "🤔", name: "Twijfelend", tip: "Twijfelen is oké. Je mag er rustig over nadenken." },
] as const;
export const FEELING_ROUNDS = 8;
export function feelingRound(rnd: () => number = Math.random) {
  const answer = pick(FEELINGS, rnd);
  const others = shuffle(
    FEELINGS.filter((f) => f.name !== answer.name),
    rnd,
  ).slice(0, 2);
  return { answer, options: shuffle([answer.name, ...others.map((o) => o.name)], rnd) };
}

/** Thoughts: helpful ones to keep, unhelpful ones to let go, each with a kinder way to see it. */
export const THOUGHTS: { text: string; keep: boolean; kinder?: string }[] = [
  { text: "Ik mag fouten maken.", keep: true },
  { text: "Ik doe mijn best en dat is genoeg.", keep: true },
  { text: "Ik kan om hulp vragen.", keep: true },
  { text: "Morgen is een nieuwe dag.", keep: true },
  { text: "Ik ben goed zoals ik ben.", keep: true },
  { text: "Oefenen maakt het makkelijker.", keep: true },
  { text: "Mijn gevoelens mogen er zijn.", keep: true },
  { text: "Ik ben trots op wat ik al kan.", keep: true },
  { text: "Van fouten leer ik.", keep: true },
  { text: "Ik hoef niet perfect te zijn.", keep: true },
  {
    text: "Ik kan niks goed.",
    keep: false,
    kinder:
      "Sommige dingen gaan nog niet goed, en dat is oké. Andere dingen kan ik juist heel goed.",
  },
  {
    text: "Iedereen vindt mij stom.",
    keep: false,
    kinder: "Ik weet niet wat anderen denken. Er zijn mensen die mij leuk vinden.",
  },
  {
    text: "Ik ga het toch niet halen.",
    keep: false,
    kinder: "Ik weet het pas als ik het probeer.",
  },
  {
    text: "Ik ben de enige die dit moeilijk vindt.",
    keep: false,
    kinder: "Veel mensen vinden dit moeilijk. Ik ben niet alleen.",
  },
  {
    text: "Als het niet perfect is, is het mislukt.",
    keep: false,
    kinder: "Goed genoeg is ook goed.",
  },
  {
    text: "Ik mag niet verdrietig zijn.",
    keep: false,
    kinder: "Al mijn gevoelens mogen er zijn, ook verdriet.",
  },
  {
    text: "Het is altijd mijn schuld.",
    keep: false,
    kinder: "Soms gaan dingen mis zonder dat het iemands schuld is.",
  },
  {
    text: "Ik kan dit niet.",
    keep: false,
    kinder: "Ik kan dit nog niet. Ik leer het stap voor stap.",
  },
  {
    text: "Niemand wil met mij praten.",
    keep: false,
    kinder: "Ik kan iemand een berichtje sturen. Er zijn mensen die naar me luisteren.",
  },
  {
    text: "Eén fout en alles is verpest.",
    keep: false,
    kinder: "Eén fout is maar één moment. Ik kan het opnieuw proberen.",
  },
];
export const THOUGHT_ROUNDS = 10;

/** Odd one out: pairs of look-alikes; the grid grows as you find more. */
export const LOOKALIKES = [
  ["🐱", "🐯"],
  ["🍎", "🍅"],
  ["😀", "😃"],
  ["🌸", "🌺"],
  ["⭐", "🌟"],
  ["🐶", "🐕"],
  ["🌙", "🌛"],
  ["🐻", "🐨"],
  ["🍓", "🍒"],
  ["🐸", "🐢"],
  ["🎈", "🏮"],
  ["🍪", "🥯"],
] as const;
export const oddGridSize = (found: number) => (found < 3 ? 3 : found < 7 ? 4 : 5);
export function oddRound(found: number, rnd: () => number = Math.random) {
  const [same, odd] = pick(LOOKALIKES, rnd);
  const size = oddGridSize(found);
  return { size, same, odd, oddIndex: Math.floor(rnd() * size * size) };
}

/** Highest score per game from the member's finished games. */
export function bestScores(plays: { game: string; score: number }[]) {
  const best: Partial<Record<PetGameId, number>> = {};
  for (const p of plays) {
    const id = p.game as PetGameId;
    best[id] = Math.max(best[id] ?? 0, p.score);
  }
  return best;
}

export function rewardMessage(xp: number) {
  return xp > 0
    ? `+${xp} XP voor je diertje! 🎉`
    : `Je hebt vandaag al ${GAMES_WITH_XP_PER_DAY} keer punten verdiend. Spelen mag altijd! 😊`;
}
