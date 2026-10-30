/** Result of one move in a turn-based chat game. `next` is who plays now: the same player again or the other one. */
export type MoveResult<S> = {
  state: S;
  next: "same" | "other";
  finished: boolean;
  winner: 0 | 1 | null;
};
