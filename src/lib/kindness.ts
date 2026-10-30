/**
 * Mean words that are hidden in chats and groups (the database does the same with censor()).
 * Words that people also use normally are left out on purpose: "kanker" (someone may talk about an
 * ill parent), "klote" (a bad day), "homo" (who you are). Phrases like "ga dood" are bullying.
 */
export const MEAN_WORDS = [
  "kut",
  "kutwijf",
  "kutjoch",
  "klootzak",
  "lul",
  "eikel",
  "hoer",
  "hoeren",
  "hoerenjong",
  "slet",
  "sletten",
  "mongool",
  "mongolen",
  "debiel",
  "tyfus",
  "tyfuslijer",
  "tering",
  "teringlijer",
  "kankerlijer",
  "kankerhoer",
  "kkr",
  "fuck",
  "fucking",
  "fucker",
  "motherfucker",
  "bitch",
  "bitches",
  "kys",
  "ga\\s+(toch\\s+)?dood",
] as const;

/** The alternation used in both the app and the database (keep them the same). */
export const MEAN_ALTERNATION = MEAN_WORDS.join("|");
export const MASK = "✱✱✱";

const meanRe = () => new RegExp(`\\b(${MEAN_ALTERNATION})\\b`, "gi");

/** Does a message contain mean words? Then Riti asks "are you sure?" first. */
export const isMean = (text: string) => meanRe().test(text);

/** The message as others will see it. */
export const censor = (text: string) => text.replace(meanRe(), MASK);
