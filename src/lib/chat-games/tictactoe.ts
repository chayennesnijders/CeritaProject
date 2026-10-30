import type { MoveResult } from "./types";

/** Boter, kaas en eieren: 9 squares, 0 = empty, 1 = first player (❌), 2 = second player (⭕). */
export type TttState = { board: number[] };
export const tttStart = (): TttState => ({ board: Array(9).fill(0) });

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/** The winning line, if there is one. */
export function tttLine(board: number[]) {
  return (
    LINES.find(
      ([a, b, c]) => board[a!] !== 0 && board[a!] === board[b!] && board[a!] === board[c!],
    ) ?? null
  );
}

export function tttMove(s: TttState, player: 0 | 1, square: number): MoveResult<TttState> | null {
  if (square < 0 || square > 8 || s.board[square] !== 0 || tttLine(s.board)) return null;
  const board = [...s.board];
  board[square] = player + 1;
  const line = tttLine(board);
  const full = board.every((v) => v !== 0);
  return {
    state: { board },
    next: "other",
    finished: !!line || full,
    winner: line ? player : null,
  };
}
