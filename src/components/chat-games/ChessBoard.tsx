import { useEffect, useState } from "react";
import { chessMove, chessMoves, type ChessMove, type ChessState } from "@/lib/chat-games/chess";
import type { BoardProps } from "./types";

// Filled glyphs for both sides (coloured by CSS); ︎ keeps phones from drawing ♟ as an emoji.
const GLYPH: Record<string, string> = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
const PROMOS = ["q", "r", "b", "n"];

/** Schaken: tap one of your pieces, then where it should go. Black sees the board from its own side. */
export function ChessBoard({ state, me, myTurn, busy, onMove }: BoardProps<ChessState>) {
  const [sel, setSel] = useState<number | null>(null);
  const [promo, setPromo] = useState<ChessMove | null>(null);
  const playing = myTurn && me !== null && !busy;
  const legal = playing ? chessMoves(state, me!) : [];
  const targets = sel === null ? [] : legal.filter((m) => m.from === sel).map((m) => m.to);
  const flip = me === 1;
  // After a checking move, the king of the side that did NOT just move is in check.
  const mover = state.last ? state.board[state.last[1]]! : "";
  const checked =
    state.check && mover ? state.board.indexOf(mover === mover.toUpperCase() ? "k" : "K") : -1;

  useEffect(() => {
    setSel(null);
    setPromo(null);
  }, [state]);

  function tap(sq: number) {
    if (!playing) return;
    if (sel !== null && targets.includes(sq)) {
      const m = legal.find((x) => x.from === sel && x.to === sq)!;
      if (m.promo) return setPromo({ from: sel, to: sq });
      const r = chessMove(state, me!, { from: sel, to: sq });
      if (r) onMove(r);
      return;
    }
    setSel(legal.some((m) => m.from === sq) ? sq : null);
  }

  const squares = Array.from({ length: 64 }, (_, i) => (flip ? 63 - i : i));
  return (
    <div className="space-y-3">
      <div className="relative mx-auto grid w-full max-w-sm select-none grid-cols-8 overflow-hidden rounded-2xl border-4 border-[#6b3e1f] shadow-soft">
        {squares.map((sq) => {
          const dark = (Math.floor(sq / 8) + (sq % 8)) % 2 === 1;
          const p = state.board[sq]!;
          const lastMove = state.last?.includes(sq);
          const target = targets.includes(sq);
          return (
            <button
              key={sq}
              onClick={() => tap(sq)}
              aria-label={p ? `Stuk ${p}` : "Leeg veld"}
              className={`relative grid aspect-square place-items-center ${dark ? "bg-[#b58863]" : "bg-[#f0d9b5]"}`}
            >
              {lastMove && <span className="absolute inset-0 bg-[#f5c518]/40" />}
              {sel === sq && <span className="absolute inset-0 bg-primary/50" />}
              {sq === checked && <span className="absolute inset-0 bg-[#e53935]/60" />}
              {p && (
                <span
                  className="relative text-[min(8vw,2.1rem)] leading-none"
                  style={{
                    color: p === p.toUpperCase() ? "#fff" : "#2a1a14",
                    textShadow:
                      p === p.toUpperCase()
                        ? "0 0 1px #000, 0 0 1px #000, 0 1px 1px #000"
                        : "0 0 1px #fff8",
                  }}
                >
                  {GLYPH[p.toLowerCase()]}
                  {"︎"}
                </span>
              )}
              {target && (
                <span
                  className={`absolute rounded-full ${p ? "inset-0.5 border-4 border-primary/70" : "size-3 bg-primary/70"}`}
                />
              )}
            </button>
          );
        })}
        {promo && (
          <div className="absolute inset-0 grid place-items-center bg-black/40">
            <div className="rounded-2xl bg-card p-3 text-center shadow-soft">
              <p className="mb-2 text-sm font-semibold">Wat wordt je pion?</p>
              <div className="flex gap-2">
                {PROMOS.map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      const r = chessMove(state, me!, { ...promo, promo: t });
                      setPromo(null);
                      if (r) onMove(r);
                    }}
                    className="grid size-12 place-items-center rounded-xl bg-muted text-3xl"
                    style={{
                      color: me === 0 ? "#fff" : "#2a1a14",
                      textShadow: me === 0 ? "0 0 1px #000, 0 0 1px #000" : "none",
                    }}
                  >
                    {GLYPH[t]}
                    {"︎"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {playing && (
        <p className="text-center text-sm font-semibold">
          {state.check ? "Schaak! Bescherm je koning. " : ""}
          {sel === null ? "Tik op een van je stukken." : "Tik op een stip om te zetten."}
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
