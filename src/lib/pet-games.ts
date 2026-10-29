/** Minigames next to the pet. The server (finish_pet_game) gives 5 XP for the first 3 games a day. */
export const PET_GAMES = [
  {
    id: "vangen",
    emoji: "🍓",
    label: "Snoepjes vangen",
    text: "Beweeg je diertje en vang zoveel mogelijk snoepjes in 30 seconden.",
  },
  {
    id: "memory",
    emoji: "🃏",
    label: "Memory",
    text: "Draai de kaartjes om en zoek de paren. Hoe minder beurten, hoe beter!",
  },
  {
    id: "ballonnen",
    emoji: "🎈",
    label: "Ballonnen knallen",
    text: "Tik zo snel als je kunt op de ballonnen. Een gouden ster telt dubbel!",
  },
] as const;
export type PetGameId = (typeof PET_GAMES)[number]["id"];

export const GAME_XP = 5;
export const GAMES_WITH_XP_PER_DAY = 3;

/** Shuffled memory deck: every emoji twice. `rnd` is injectable for tests. */
export function makeMemoryDeck(emojis: readonly string[], rnd: () => number = Math.random) {
  const deck = [...emojis, ...emojis];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }
  return deck;
}

/** 100 points for a perfect game (one turn per pair), 5 less for every extra turn, never below 10. */
export function memoryScore(turns: number, pairs: number) {
  return Math.max(10, 100 - Math.max(0, turns - pairs) * 5);
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
