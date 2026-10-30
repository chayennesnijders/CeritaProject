import { tttLine, tttMove, type TttState } from "@/lib/chat-games/tictactoe";
import type { BoardProps } from "./types";

const MARK = ["", "❌", "⭕"];

export function TicTacToeBoard({ state, me, myTurn, busy, onMove }: BoardProps<TttState>) {
  const line = tttLine(state.board) ?? [];
  return (
    <div className="mx-auto grid aspect-square w-full max-w-xs grid-cols-3 grid-rows-3 gap-2 rounded-3xl bg-ink p-2">
      {state.board.map((v, i) => (
        <button
          key={i}
          aria-label={v ? `Vak ${i + 1}: ${MARK[v]}` : `Vak ${i + 1}: leeg`}
          disabled={!myTurn || busy || v !== 0 || me === null}
          onClick={() => {
            const r = tttMove(state, me!, i);
            if (r) onMove(r);
          }}
          className={`grid place-items-center rounded-2xl text-5xl transition-transform active:scale-95 ${line.includes(i) ? "bg-primary" : "bg-card"}`}
        >
          <span className={v ? "animate-in zoom-in-50" : ""}>{MARK[v]}</span>
        </button>
      ))}
    </div>
  );
}
