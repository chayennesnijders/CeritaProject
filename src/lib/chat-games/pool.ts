import type { MoveResult } from "./types";

/**
 * Pool, simple rules: 9 coloured balls. Pot a ball: +1 point and shoot again. Pot the white ball:
 * it goes back to the start and the turn passes. Whoever has 5 points (or the most at the end) wins.
 * The physics are deterministic, so the other player can watch the exact same shot afterwards.
 */
export const TABLE = { w: 2, h: 1 };
export const BALL_R = 0.032;
export const POCKET_R = 0.07;
export const POCKETS = [
  [0, 0],
  [1, -0.01],
  [2, 0],
  [0, 1],
  [1, 1.01],
  [2, 1],
] as const;
export const CUE_START = { x: 0.5, y: 0.5 };
export const BALL_COLORS = [
  "#ffffff",
  "#f5c518",
  "#2463eb",
  "#e53935",
  "#7b1fa2",
  "#fb8c00",
  "#2e7d32",
  "#8d2a1a",
  "#212121",
  "#f06292",
];

export type Ball = { id: number; x: number; y: number; potted: boolean };
export type PoolShot = { angle: number; power: number; by: 0 | 1 };
export type PoolState = {
  balls: Ball[];
  scores: [number, number];
  last?: PoolShot;
  before?: Ball[];
};

export function poolStart(): PoolState {
  // Diamond rack of 9 balls, apex towards the cue ball.
  const rows = [1, 2, 3, 2, 1];
  const balls: Ball[] = [{ id: 0, ...CUE_START, potted: false }];
  let id = 1;
  const d = BALL_R * 2 + 0.002;
  rows.forEach((n, i) => {
    for (let k = 0; k < n; k++)
      balls.push({
        id: id++,
        x: 1.45 + i * d * 0.87,
        y: 0.5 + (k - (n - 1) / 2) * d,
        potted: false,
      });
  });
  return { balls, scores: [0, 0] };
}

const FRICTION = 0.995;
const STEP = 1 / 120;
const MAX_SPEED = 4;

/** Simulates one shot. `frames` are ball positions every few steps, for the animation. */
export function simulate(balls: Ball[], angle: number, power: number) {
  const b = balls.map((x) => ({ ...x, vx: 0, vy: 0 }));
  const cue = b.find((x) => x.id === 0)!;
  const p = Math.min(Math.max(power, 0.05), 1) * MAX_SPEED;
  cue.vx = Math.cos(angle) * p;
  cue.vy = Math.sin(angle) * p;
  const frames: Ball[][] = [];
  const potted: number[] = [];
  for (let step = 0; step < 6000; step++) {
    let moving = false;
    for (const x of b) {
      if (x.potted) continue;
      x.x += x.vx * STEP;
      x.y += x.vy * STEP;
      x.vx *= FRICTION;
      x.vy *= FRICTION;
      if (Math.hypot(x.vx, x.vy) < 0.01) x.vx = x.vy = 0;
      else moving = true;
      for (const [px, py] of POCKETS)
        if (Math.hypot(x.x - px, x.y - py) < POCKET_R) {
          x.potted = true;
          x.vx = x.vy = 0;
          potted.push(x.id);
        }
      if (x.potted) continue;
      if (x.x < BALL_R) {
        x.x = BALL_R;
        x.vx = Math.abs(x.vx) * 0.8;
      }
      if (x.x > TABLE.w - BALL_R) {
        x.x = TABLE.w - BALL_R;
        x.vx = -Math.abs(x.vx) * 0.8;
      }
      if (x.y < BALL_R) {
        x.y = BALL_R;
        x.vy = Math.abs(x.vy) * 0.8;
      }
      if (x.y > TABLE.h - BALL_R) {
        x.y = TABLE.h - BALL_R;
        x.vy = -Math.abs(x.vy) * 0.8;
      }
    }
    // Ball-to-ball: equal masses, elastic, a little energy lost.
    for (let i = 0; i < b.length; i++)
      for (let j = i + 1; j < b.length; j++) {
        const a = b[i]!,
          c = b[j]!;
        if (a.potted || c.potted) continue;
        const dx = c.x - a.x,
          dy = c.y - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist === 0 || dist >= BALL_R * 2) continue;
        const nx = dx / dist,
          ny = dy / dist;
        const overlap = BALL_R * 2 - dist;
        a.x -= (nx * overlap) / 2;
        a.y -= (ny * overlap) / 2;
        c.x += (nx * overlap) / 2;
        c.y += (ny * overlap) / 2;
        const rel = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny;
        if (rel <= 0) continue;
        const k = rel * 0.96;
        a.vx -= k * nx;
        a.vy -= k * ny;
        c.vx += k * nx;
        c.vy += k * ny;
        moving = true;
      }
    if (step % 4 === 0)
      frames.push(b.map(({ id, x, y, potted: pt }) => ({ id, x, y, potted: pt })));
    if (!moving) break;
  }
  const end = b.map(({ id, x, y, potted: pt }) => ({ id, x, y, potted: pt }));
  frames.push(end);
  return { balls: end, frames, potted };
}

/** Puts the white ball back at the start (moved up a bit if another ball is in the way). */
function respotCue(balls: Ball[]) {
  const spot = { ...CUE_START };
  while (
    balls.some(
      (x) => x.id !== 0 && !x.potted && Math.hypot(x.x - spot.x, x.y - spot.y) < BALL_R * 2,
    )
  )
    spot.y -= BALL_R * 2.2;
  return balls.map((x) => (x.id === 0 ? { ...x, ...spot, potted: false } : x));
}

export const POOL_TO_WIN = 5;

export function poolMove(
  s: PoolState,
  player: 0 | 1,
  angle: number,
  power: number,
): MoveResult<PoolState> & { frames: Ball[][] } {
  const { balls, frames, potted } = simulate(s.balls, angle, power);
  const scored = potted.filter((id) => id !== 0).length;
  const cueLost = potted.includes(0);
  const scores: [number, number] = [...s.scores];
  scores[player] += scored;
  const state: PoolState = {
    balls: cueLost ? respotCue(balls) : balls,
    scores,
    last: { angle, power, by: player },
    before: s.balls,
  };
  const left = state.balls.filter((x) => x.id !== 0 && !x.potted).length;
  const finished = scores[0] >= POOL_TO_WIN || scores[1] >= POOL_TO_WIN || left === 0;
  const winner = finished ? (scores[0] === scores[1] ? null : scores[0] > scores[1] ? 0 : 1) : null;
  return { state, frames, next: scored > 0 && !cueLost ? "same" : "other", finished, winner };
}
