import type { MoveResult } from "@/lib/chat-games/types";

/** What every game board gets from the game screen. */
export type BoardProps<S> = {
  state: S;
  /** 0 or 1 when you play along, null when you only watch. */
  me: 0 | 1 | null;
  myTurn: boolean;
  busy: boolean;
  onMove: (r: MoveResult<S>) => void;
  /** Game id plus move number: the same for both players, used for dice. */
  seed?: string;
};
