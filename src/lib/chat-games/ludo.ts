import type { MoveResult } from "./types";

/**
 * Mens erger je niet for two players. Each player has 4 pawns. A pawn's position counts from the
 * player's own start square: -1 = still at home base, 0..39 = on the track, 40..43 = in the finish.
 * Rules: a 6 brings a pawn out and lets you roll again; landing on the other player's pawn sends it
 * back; you need the exact number to get into the finish; with no pawn on the track you get 3 tries for a 6.
 */
export const TRACK = 40;
export const FINISH = 4;
/** Where each player's start square lies on the shared track. */
export const START = [0, 20] as const;
export type LudoState = {
  pos: [number[], number[]];
  tries: number;
  last?: { by: 0 | 1; roll: number };
};
export const ludoStart = (): LudoState => ({
  pos: [
    [-1, -1, -1, -1],
    [-1, -1, -1, -1],
  ],
  tries: 0,
});

/** The square on the shared track, or null when the pawn is at base or in the finish. */
export const trackSquare = (player: 0 | 1, p: number) =>
  p >= 0 && p < TRACK ? (p + START[player]) % TRACK : null;

/**
 * The die for this turn. It comes from the game and the move number, so closing and reopening the
 * game gives the same roll and both players see the same number.
 */
export function ludoRoll(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
  return (((h ^ (h >>> 16)) >>> 0) % 6) + 1;
}

/** Where a pawn would end up, or null when it may not move with this roll. */
export function ludoTarget(s: LudoState, player: 0 | 1, pawn: number, roll: number) {
  const mine = s.pos[player]!;
  const p = mine[pawn]!;
  let to: number;
  if (p === -1) {
    if (roll !== 6) return null;
    to = 0;
  } else {
    to = p + roll;
    if (to >= TRACK + FINISH) return null;
  }
  // Never on top of your own pawn.
  if (mine.some((q, i) => i !== pawn && q === to)) return null;
  return to;
}

export const ludoMovable = (s: LudoState, player: 0 | 1, roll: number) =>
  [0, 1, 2, 3].filter((i) => ludoTarget(s, player, i, roll) !== null);

/** One turn: the roll plus the chosen pawn (null when no pawn can move). */
export function ludoMove(
  s: LudoState,
  player: 0 | 1,
  roll: number,
  pawn: number | null,
): MoveResult<LudoState> | null {
  const movable = ludoMovable(s, player, roll);
  const pos = s.pos.map((x) => [...x]) as [number[], number[]];
  const other = (1 - player) as 0 | 1;
  if (pawn === null) {
    if (movable.length) return null;
    // Nothing on the track: up to three tries to roll a 6.
    const onTrack = pos[player].some((p) => p >= 0 && p < TRACK);
    const again = roll === 6 || (!onTrack && s.tries < 2);
    return {
      state: { pos, tries: again ? s.tries + 1 : 0, last: { by: player, roll } },
      next: again ? "same" : "other",
      finished: false,
      winner: null,
    };
  }
  if (!movable.includes(pawn)) return null;
  const to = ludoTarget(s, player, pawn, roll)!;
  pos[player][pawn] = to;
  const sq = trackSquare(player, to);
  if (sq !== null) pos[other] = pos[other].map((q) => (trackSquare(other, q) === sq ? -1 : q));
  const won = pos[player].every((p) => p >= TRACK);
  return {
    state: { pos, tries: 0, last: { by: player, roll } },
    next: roll === 6 && !won ? "same" : "other",
    finished: won,
    winner: won ? player : null,
  };
}
