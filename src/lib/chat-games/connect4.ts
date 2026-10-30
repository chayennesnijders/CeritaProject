import type { MoveResult } from "./types";

/** Vier op een rij: 7 columns × 6 rows, row 0 at the top. 0 = empty, 1 = first player (🔴), 2 = second (🟡). */
export const C4_COLS = 7;
export const C4_ROWS = 6;
export type C4State = { board: number[]; last?: number };
export const c4Start = (): C4State => ({ board: Array(C4_COLS * C4_ROWS).fill(0) });
const at = (r: number, c: number) => r * C4_COLS + c;

/** The four winning cells, if someone has four in a row. */
export function c4Line(board: number[]) {
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < C4_ROWS; r++)
    for (let c = 0; c < C4_COLS; c++) {
      const v = board[at(r, c)];
      if (!v) continue;
      for (const [dr, dc] of dirs) {
        const cells = [0, 1, 2, 3].map((k) => [r + dr! * k, c + dc! * k] as const);
        if (
          cells.every(
            ([rr, cc]) =>
              rr >= 0 && rr < C4_ROWS && cc >= 0 && cc < C4_COLS && board[at(rr, cc)] === v,
          )
        )
          return cells.map(([rr, cc]) => at(rr, cc));
      }
    }
  return null;
}

export function c4Move(s: C4State, player: 0 | 1, col: number): MoveResult<C4State> | null {
  if (col < 0 || col >= C4_COLS || c4Line(s.board)) return null;
  let row = -1;
  for (let r = C4_ROWS - 1; r >= 0; r--)
    if (s.board[at(r, col)] === 0) {
      row = r;
      break;
    }
  if (row < 0) return null;
  const board = [...s.board];
  board[at(row, col)] = player + 1;
  const line = c4Line(board);
  const full = board.every((v) => v !== 0);
  return {
    state: { board, last: at(row, col) },
    next: "other",
    finished: !!line || full,
    winner: line ? player : null,
  };
}
