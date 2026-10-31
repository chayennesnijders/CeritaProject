import type { MoveResult } from "./types";

/** Darten: 3 rounds of 3 darts each; the highest total wins. */
export const DART_ROUNDS = 3;
export type Dart = { x: number; y: number; score: number; label: string };
export type DartsState = { rounds: number[][]; last?: Dart[] };
export const dartsStart = (): DartsState => ({ rounds: [[], []] });

/** Numbers clockwise from the top, like a real dartboard. */
export const DART_NUMBERS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
// Radii relative to the outer edge of the double ring (real board: 170 mm).
export const RINGS = {
  bull: 6.35 / 170,
  outerBull: 15.9 / 170,
  tripleIn: 99 / 170,
  tripleOut: 107 / 170,
  doubleIn: 162 / 170,
};

/** Score of a dart at (x, y), with the centre at (0, 0), 1 = outer edge of the double ring, y pointing down. */
export function dartScore(x: number, y: number): { score: number; label: string } {
  const r = Math.hypot(x, y);
  if (r <= RINGS.bull) return { score: 50, label: "Bull's-eye!" };
  if (r <= RINGS.outerBull) return { score: 25, label: "25" };
  if (r > 1) return { score: 0, label: "Mis" };
  // Angle clockwise from the top, each number has 18°, the 20 is centred on the top.
  const deg = ((Math.atan2(x, -y) * 180) / Math.PI + 360 + 9) % 360;
  const n = DART_NUMBERS[Math.floor(deg / 18)]!;
  if (r >= RINGS.tripleIn && r <= RINGS.tripleOut) return { score: n * 3, label: `Triple ${n}` };
  if (r >= RINGS.doubleIn) return { score: n * 2, label: `Dubbel ${n}` };
  return { score: n, label: String(n) };
}

export const dartsTotal = (s: DartsState, p: 0 | 1) => s.rounds[p]!.reduce((a, b) => a + b, 0);

/** One player's turn of three darts. */
export function dartsMove(
  s: DartsState,
  player: 0 | 1,
  darts: Dart[],
): MoveResult<DartsState> | null {
  if (darts.length !== 3 || s.rounds[player]!.length >= DART_ROUNDS) return null;
  const rounds = s.rounds.map((r) => [...r]);
  rounds[player]!.push(darts.reduce((a, d) => a + dartScore(d.x, d.y).score, 0));
  const state = { rounds, last: darts };
  const finished = rounds.every((r) => r.length >= DART_ROUNDS);
  const a = dartsTotal(state, 0);
  const b = dartsTotal(state, 1);
  return {
    state,
    next: "other",
    finished,
    winner: finished ? (a === b ? null : a > b ? 0 : 1) : null,
  };
}

/** Where the dart starts, below the board (same units as the board: 1 = edge of the double ring). */
export const DART_START = { x: 0, y: 1.6 };
const AIM_GAIN = 2;

/**
 * Your hand is never completely still: while you hold the dart the aim sways in a slow figure-eight,
 * and the longer you hold, the more tired your arm gets and the bigger the sway. Let go at the right
 * moment! `heldMs` is how long you have been pulling.
 */
export function dartSway(heldMs: number) {
  const t = heldMs / 1000;
  const size = 0.07 + Math.min(t, 4) * 0.035; // 0.07 at the start, 0.21 after 4 seconds
  return {
    x: Math.sin(t * 2.3) * size,
    y: Math.sin(t * 3.1 + 1.2) * size * 0.75,
    size,
  };
}

/**
 * Throw like a slingshot: pull the dart back (down) and let go. `pull` is how far you dragged the finger
 * (finger now minus finger start). Pulling straight down by about 0.8 aims at the bull's-eye;
 * pulling sideways aims the other way. `heldMs` adds the sway of your hand (see dartSway), and
 * `wobble` (two numbers between -1 and 1) is the last little shake when you let go: the dart lands
 * somewhere inside the circle of radius `spread` around the aim.
 */
export function dartAim(
  pull: { x: number; y: number },
  wobble: [number, number] = [0, 0],
  heldMs = 0,
) {
  const power = Math.min(Math.hypot(pull.x, pull.y), 1.2);
  const sway = heldMs > 0 ? dartSway(heldMs) : { x: 0, y: 0 };
  // Pulling harder than needed makes the throw less steady.
  const spread = 0.06 + Math.max(0, power - 0.8) * 0.25;
  const aimX = DART_START.x - pull.x * AIM_GAIN * 0.6 + sway.x;
  const aimY = DART_START.y - pull.y * AIM_GAIN + sway.y;
  return {
    aimX,
    aimY,
    x: aimX + wobble[0] * spread,
    y: aimY + wobble[1] * spread,
    spread,
    power: power / 1.2,
  };
}
