import type { MoveResult } from "./types";

/**
 * Schaken. 64 squares, index = row * 8 + column, row 0 at the top (black's side). Uppercase = white
 * (first player), lowercase = black. All official moves: castling, en passant and promotion.
 * The game ends in checkmate, stalemate, the 50-move rule or when only the two kings are left.
 */
export type ChessState = {
  board: string[];
  castling: string; // which castlings are still allowed: "KQkq"
  ep: number; // square a pawn can capture en passant, -1 if none
  half: number; // moves since the last capture or pawn move (50-move rule)
  last?: [number, number];
  check?: boolean;
};
export type ChessMove = { from: number; to: number; promo?: string };

const START_ROW = "rnbqkbnr";
export function chessStart(): ChessState {
  const board = Array<string>(64).fill("");
  for (let c = 0; c < 8; c++) {
    board[c] = START_ROW[c]!;
    board[8 + c] = "p";
    board[48 + c] = "P";
    board[56 + c] = START_ROW[c]!.toUpperCase();
  }
  return { board, castling: "KQkq", ep: -1, half: 0 };
}

const isWhite = (p: string) => p !== "" && p === p.toUpperCase();
const colorOf = (p: string): 0 | 1 | null => (p === "" ? null : isWhite(p) ? 0 : 1);
const rc = (sq: number) => [Math.floor(sq / 8), sq % 8] as const;
const on = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;
const KNIGHT = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
];
const KING = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];
const ROOK = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
const BISHOP = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

/** Is square `sq` attacked by `by`? */
export function attacked(board: string[], sq: number, by: 0 | 1): boolean {
  const [r, c] = rc(sq);
  const own = (p: string | undefined, t: string) =>
    !!p && colorOf(p) === by && p.toLowerCase() === t;
  const pr = by === 0 ? r + 1 : r - 1; // white pawns attack upwards, so they stand one row below
  for (const dc of [-1, 1]) if (on(pr, c + dc) && own(board[pr * 8 + c + dc], "p")) return true;
  for (const [dr, dc] of KNIGHT)
    if (on(r + dr!, c + dc!) && own(board[(r + dr!) * 8 + c + dc!], "n")) return true;
  for (const [dr, dc] of KING)
    if (on(r + dr!, c + dc!) && own(board[(r + dr!) * 8 + c + dc!], "k")) return true;
  for (const [dirs, kinds] of [
    [ROOK, "rq"],
    [BISHOP, "bq"],
  ] as const)
    for (const [dr, dc] of dirs) {
      let rr = r + dr!,
        cc = c + dc!;
      while (on(rr, cc)) {
        const p = board[rr * 8 + cc]!;
        if (p) {
          if (colorOf(p) === by && kinds.includes(p.toLowerCase())) return true;
          break;
        }
        rr += dr!;
        cc += dc!;
      }
    }
  return false;
}

const kingSquare = (board: string[], color: 0 | 1) => board.indexOf(color === 0 ? "K" : "k");
export const inCheck = (s: ChessState, color: 0 | 1) =>
  attacked(s.board, kingSquare(s.board, color), (1 - color) as 0 | 1);

function pseudoMoves(s: ChessState, color: 0 | 1): ChessMove[] {
  const out: ChessMove[] = [];
  const b = s.board;
  for (let sq = 0; sq < 64; sq++) {
    const p = b[sq]!;
    if (colorOf(p) !== color) continue;
    const [r, c] = rc(sq);
    const t = p.toLowerCase();
    const add = (to: number) => {
      const [tr] = rc(to);
      if (t === "p" && (tr === 0 || tr === 7))
        for (const promo of "qrbn") out.push({ from: sq, to, promo });
      else out.push({ from: sq, to });
    };
    if (t === "p") {
      const dir = color === 0 ? -1 : 1;
      const one = (r + dir) * 8 + c;
      if (on(r + dir, c) && !b[one]) {
        add(one);
        const startRow = color === 0 ? 6 : 1;
        const two = (r + 2 * dir) * 8 + c;
        if (r === startRow && !b[two]) add(two);
      }
      for (const dc of [-1, 1]) {
        if (!on(r + dir, c + dc)) continue;
        const to = (r + dir) * 8 + c + dc;
        if ((b[to] && colorOf(b[to]!) !== color) || to === s.ep) add(to);
      }
      continue;
    }
    const steps = t === "n" ? KNIGHT : t === "k" ? KING : null;
    if (steps) {
      for (const [dr, dc] of steps)
        if (on(r + dr!, c + dc!)) {
          const to = (r + dr!) * 8 + c + dc!;
          if (colorOf(b[to]!) !== color) add(to);
        }
    } else {
      const dirs = t === "r" ? ROOK : t === "b" ? BISHOP : [...ROOK, ...BISHOP];
      for (const [dr, dc] of dirs) {
        let rr = r + dr!,
          cc = c + dc!;
        while (on(rr, cc)) {
          const to = rr * 8 + cc;
          if (b[to]) {
            if (colorOf(b[to]!) !== color) add(to);
            break;
          }
          add(to);
          rr += dr!;
          cc += dc!;
        }
      }
    }
    // Castling: king and rook unmoved, squares between empty, king not in, through or into check.
    if (t === "k") {
      const row = color === 0 ? 56 : 0;
      const enemy = (1 - color) as 0 | 1;
      if (sq === row + 4 && !attacked(b, sq, enemy)) {
        const [k, q] = color === 0 ? ["K", "Q"] : ["k", "q"];
        if (s.castling.includes(k!) && !b[row + 5] && !b[row + 6] && !attacked(b, row + 5, enemy))
          out.push({ from: sq, to: row + 6 });
        if (
          s.castling.includes(q!) &&
          !b[row + 3] &&
          !b[row + 2] &&
          !b[row + 1] &&
          !attacked(b, row + 3, enemy)
        )
          out.push({ from: sq, to: row + 2 });
      }
    }
  }
  return out;
}

/** The position after a move (does not check whether the move is legal). */
export function applyChess(s: ChessState, m: ChessMove): ChessState {
  const b = [...s.board];
  const p = b[m.from]!;
  const t = p.toLowerCase();
  const white = isWhite(p);
  const capture = !!b[m.to] || (t === "p" && m.to === s.ep);
  if (t === "p" && m.to === s.ep) b[m.to + (white ? 8 : -8)] = "";
  if (t === "k" && Math.abs(m.to - m.from) === 2) {
    const row = m.from - 4;
    if (m.to > m.from) {
      b[row + 5] = b[row + 7]!;
      b[row + 7] = "";
    } else {
      b[row + 3] = b[row]!;
      b[row] = "";
    }
  }
  b[m.to] = m.promo ? (white ? m.promo.toUpperCase() : m.promo) : p;
  b[m.from] = "";
  let castling = s.castling;
  const drop = (chars: string) => (castling = castling.replace(new RegExp(`[${chars}]`, "g"), ""));
  if (p === "K") drop("KQ");
  if (p === "k") drop("kq");
  for (const sq of [m.from, m.to]) {
    if (sq === 63) drop("K");
    if (sq === 56) drop("Q");
    if (sq === 7) drop("k");
    if (sq === 0) drop("q");
  }
  const ep = t === "p" && Math.abs(m.to - m.from) === 16 ? (m.from + m.to) / 2 : -1;
  return {
    board: b,
    castling,
    ep,
    half: capture || t === "p" ? 0 : s.half + 1,
    last: [m.from, m.to],
  };
}

export function chessMoves(s: ChessState, color: 0 | 1): ChessMove[] {
  return pseudoMoves(s, color).filter((m) => !inCheck(applyChess(s, m), color));
}

export function chessMove(
  s: ChessState,
  player: 0 | 1,
  m: ChessMove,
): MoveResult<ChessState> | null {
  const legal = chessMoves(s, player).find(
    (x) =>
      x.from === m.from && x.to === m.to && (x.promo ?? "") === (x.promo ? (m.promo ?? "q") : ""),
  );
  if (!legal) return null;
  const next = applyChess(s, legal);
  const other = (1 - player) as 0 | 1;
  const check = inCheck(next, other);
  const state = { ...next, check };
  const stuck = chessMoves(state, other).length === 0;
  const onlyKings = next.board.filter((p) => p !== "").length === 2;
  const finished = stuck || onlyKings || next.half >= 100;
  return { state, next: "other", finished, winner: stuck && check ? player : null };
}
