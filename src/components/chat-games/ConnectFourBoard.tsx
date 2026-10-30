import { C4_COLS, c4Line, c4Move, type C4State } from "@/lib/chat-games/connect4";
import type { BoardProps } from "./types";

const DISC = ["bg-[#1e3a8a]/40", "bg-[#e53935]", "bg-[#f5c518]"];

export function ConnectFourBoard({ state, me, myTurn, busy, onMove }: BoardProps<C4State>) {
  const line = c4Line(state.board) ?? [];
  const canPlay = myTurn && !busy && me !== null;
  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="grid grid-cols-7 gap-1.5 rounded-3xl bg-[#2563eb] p-2 shadow-soft">
        {state.board.map((v, i) => (
          <button
            key={i}
            aria-label={`Kolom ${(i % C4_COLS) + 1}`}
            disabled={!canPlay}
            onClick={() => {
              const r = c4Move(state, me!, i % C4_COLS);
              if (r) onMove(r);
            }}
            className={`aspect-square rounded-full shadow-inner ${DISC[v]} ${line.includes(i) ? "ring-4 ring-white" : ""} ${state.last === i ? "animate-in slide-in-from-top-8 duration-300" : ""}`}
          />
        ))}
      </div>
      {canPlay && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Tik op een kolom om je {me === 0 ? "rode 🔴" : "gele 🟡"} schijf te laten vallen.
        </p>
      )}
    </div>
  );
}
