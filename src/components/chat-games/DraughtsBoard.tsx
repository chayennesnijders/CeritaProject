import { useEffect, useState } from "react";
import { damDark, damMove, damMoves, type DamState } from "@/lib/chat-games/draughts";
import type { BoardProps } from "./types";

/** Dammen: tap one of your pieces, then where it ends up. Black sees the board from its own side. */
export function DraughtsBoard({ state, me, myTurn, busy, onMove }: BoardProps<DamState>) {
  const [sel, setSel] = useState<number | null>(null);
  const playing = myTurn && me !== null && !busy;
  const legal = playing ? damMoves(state, me!) : [];
  const mustTake = legal.some((m) => m.captured.length);
  const mine = legal.filter((m) => m.path[0] === sel);
  const targets = mine.map((m) => m.path[m.path.length - 1]!);
  const flip = me === 1;

  useEffect(() => setSel(null), [state]);

  function tap(sq: number) {
    if (!playing) return;
    if (sel !== null && targets.includes(sq)) {
      const r = damMove(state, me!, sel, sq);
      if (r) onMove(r);
      return;
    }
    setSel(legal.some((m) => m.path[0] === sq) ? sq : null);
  }

  const count = (c: "w" | "b") => state.board.filter((p) => p.toLowerCase() === c).length;
  const squares = Array.from({ length: 100 }, (_, i) => (flip ? 99 - i : i));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-center text-sm">
        {(["w", "b"] as const).map((c, i) => (
          <div
            key={c}
            className={`rounded-2xl p-2 shadow-soft ${me === i ? "bg-primary/15" : "bg-card"}`}
          >
            <p className="flex items-center justify-center gap-1.5 text-lg font-bold">
              <span
                className={`inline-block size-4 rounded-full border border-black/40 ${c === "w" ? "bg-white" : "bg-[#2a1a14]"}`}
              />
              {count(c)}
            </p>
            <p className="text-[11px] text-muted-foreground">stukken over</p>
          </div>
        ))}
      </div>
      <div className="mx-auto grid w-full max-w-sm select-none grid-cols-10 overflow-hidden rounded-2xl border-4 border-[#6b3e1f] shadow-soft">
        {squares.map((sq) => {
          const dark = damDark(sq);
          const p = state.board[sq]!;
          const target = targets.includes(sq);
          const canPick = legal.some((m) => m.path[0] === sq);
          return (
            <button
              key={sq}
              disabled={!dark}
              onClick={() => tap(sq)}
              aria-label={p ? "Damsteen" : "Leeg veld"}
              className={`relative grid aspect-square place-items-center ${dark ? "bg-[#8b5e3c]" : "bg-[#f0d9b5]"}`}
            >
              {state.last?.includes(sq) && <span className="absolute inset-0 bg-[#f5c518]/35" />}
              {state.taken?.includes(sq) && (
                <span className="absolute inset-[30%] rounded-full bg-[#e53935]/50" />
              )}
              {p && (
                <span
                  className={`relative grid size-[82%] place-items-center rounded-full border-2 text-[10px] shadow-[0_2px_0_#0005] ${
                    p.toLowerCase() === "w"
                      ? "border-[#bbb] bg-white text-[#2a1a14]"
                      : "border-black bg-[#2a1a14] text-white"
                  } ${sel === sq ? "ring-4 ring-primary" : canPick && mustTake ? "ring-2 ring-primary" : ""}`}
                >
                  {p === p.toUpperCase() ? "👑" : ""}
                </span>
              )}
              {target && <span className="absolute size-3 rounded-full bg-primary/80" />}
            </button>
          );
        })}
      </div>
      {playing && (
        <p className="text-center text-sm font-semibold">
          {mustTake
            ? "Je moet slaan! Kies een stuk met een rand."
            : sel === null
              ? "Tik op een van je stukken."
              : "Tik op een stip om te zetten."}
        </p>
      )}
      {me !== null && (
        <p className="text-center text-xs text-muted-foreground">
          Jij speelt met {me === 0 ? "wit" : "zwart"}.
        </p>
      )}
    </div>
  );
}
