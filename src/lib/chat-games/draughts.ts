import type { MoveResult } from "./types";

/**
 * Dammen (international rules, 10×10). Square index = row * 10 + column, only dark squares are used
 * ((row + column) odd). "w"/"W" = white man/king (first player, starts at the bottom), "b"/"B" = black.
 * Men move one step diagonally forward and capture forward and backward; kings fly any distance.
 * Capturing is compulsory and you must take the most pieces. A man becomes a king when its move ends
 * on the far row. You lose when you cannot move. 25 king moves each without a capture is a draw.
 */
export type DamState = { board: string[]; quiet: number; last?: number[]; taken?: number[] };
export type DamMove = { path: number[]; captured: number[] };

export const damDark = (sq: number) => (Math.floor(sq / 10) + (sq % 10)) % 2 === 1;
export function damStart(): DamState {
  const board = Array<string>(100).fill("");
  for (let sq = 0; sq < 100; sq++) {
    if (!damDark(sq)) continue;
    const r = Math.floor(sq / 10);
    if (r <= 3) board[sq] = "b";
    if (r >= 6) board[sq] = "w";
  }
  return { board, quiet: 0 };
}

const DIRS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
] as const;
const on = (r: number, c: number) => r >= 0 && r < 10 && c >= 0 && c < 10;
const colorOf = (p: string): 0 | 1 | null => (p === "" ? null : p.toLowerCase() === "w" ? 0 : 1);
const isKing = (p: string) => p === "W" || p === "B";

/** All capture sequences starting from `from` (DFS; captured pieces stay on the board until the end). */
function captures(board: string[], from: number, piece: string): DamMove[] {
  const color = colorOf(piece)!;
  const king = isKing(piece);
  const out: DamMove[] = [];
  // The moving piece has left its square, so it counts as empty.
  const empty = (sq: number) => board[sq] === "" || sq === from;
  const walk = (sq: number, path: number[], taken: number[]) => {
    let extended = false;
    const [r, c] = [Math.floor(sq / 10), sq % 10];
    for (const [dr, dc] of DIRS) {
      let rr = r + dr,
        cc = c + dc;
      if (king)
        while (on(rr, cc) && empty(rr * 10 + cc)) {
          rr += dr;
          cc += dc;
        }
      if (!on(rr, cc)) continue;
      const mid = rr * 10 + cc;
      const p = board[mid]!;
      if (p === "" || colorOf(p) === color || taken.includes(mid)) continue;
      let lr = rr + dr,
        lc = cc + dc;
      while (on(lr, lc) && empty(lr * 10 + lc)) {
        const land = lr * 10 + lc;
        extended = true;
        walk(land, [...path, land], [...taken, mid]);
        if (!king) break;
        lr += dr;
        lc += dc;
      }
    }
    if (!extended && taken.length) out.push({ path, captured: taken });
  };
  walk(from, [from], []);
  return out;
}

export function damMoves(s: DamState, color: 0 | 1): DamMove[] {
  const caps: DamMove[] = [];
  const plain: DamMove[] = [];
  for (let sq = 0; sq < 100; sq++) {
    const p = s.board[sq]!;
    if (colorOf(p) !== color) continue;
    caps.push(...captures(s.board, sq, p));
    const [r, c] = [Math.floor(sq / 10), sq % 10];
    for (const [dr, dc] of DIRS) {
      if (!isKing(p) && dr !== (color === 0 ? -1 : 1)) continue;
      let rr = r + dr,
        cc = c + dc;
      while (on(rr, cc) && s.board[rr * 10 + cc] === "") {
        plain.push({ path: [sq, rr * 10 + cc], captured: [] });
        if (!isKing(p)) break;
        rr += dr;
        cc += dc;
      }
    }
  }
  if (!caps.length) return plain;
  const most = Math.max(...caps.map((m) => m.captured.length));
  return caps.filter((m) => m.captured.length === most);
}

export function damMove(
  s: DamState,
  player: 0 | 1,
  from: number,
  to: number,
): MoveResult<DamState> | null {
  const m = damMoves(s, player).find((x) => x.path[0] === from && x.path[x.path.length - 1] === to);
  if (!m) return null;
  const board = [...s.board];
  const piece = board[from]!;
  board[from] = "";
  for (const sq of m.captured) board[sq] = "";
  const row = Math.floor(to / 10);
  board[to] = !isKing(piece) && row === (player === 0 ? 0 : 9) ? piece.toUpperCase() : piece;
  const quiet = isKing(piece) && !m.captured.length ? s.quiet + 1 : 0;
  const state: DamState = { board, quiet, last: m.path, taken: m.captured };
  const other = (1 - player) as 0 | 1;
  const stuck = damMoves(state, other).length === 0;
  const draw = quiet >= 50;
  return { state, next: "other", finished: stuck || draw, winner: stuck ? player : null };
}
