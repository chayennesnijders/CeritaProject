import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  START,
  TRACK,
  ludoMovable,
  ludoMove,
  ludoRoll,
  type LudoState,
} from "@/lib/chat-games/ludo";
import type { BoardProps } from "./types";

// The board is an 11×11 grid shaped like a cross. PATH lists the 40 track squares (column, row),
// starting at player 1's start square and going clockwise.
const PATH: [number, number][] = [
  [0, 4],
  [1, 4],
  [2, 4],
  [3, 4],
  [4, 4],
  [4, 3],
  [4, 2],
  [4, 1],
  [4, 0],
  [5, 0],
  [6, 0],
  [6, 1],
  [6, 2],
  [6, 3],
  [6, 4],
  [7, 4],
  [8, 4],
  [9, 4],
  [10, 4],
  [10, 5],
  [10, 6],
  [9, 6],
  [8, 6],
  [7, 6],
  [6, 6],
  [6, 7],
  [6, 8],
  [6, 9],
  [6, 10],
  [5, 10],
  [4, 10],
  [4, 9],
  [4, 8],
  [4, 7],
  [4, 6],
  [3, 6],
  [2, 6],
  [1, 6],
  [0, 6],
  [0, 5],
];
const HOME: [number, number][][] = [
  [
    [1, 5],
    [2, 5],
    [3, 5],
    [4, 5],
  ],
  [
    [9, 5],
    [8, 5],
    [7, 5],
    [6, 5],
  ],
];
const BASE: [number, number][][] = [
  [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ],
  [
    [9, 9],
    [10, 9],
    [9, 10],
    [10, 10],
  ],
];
const COLOR = ["#e53935", "#f5c518"];
const LIGHT = ["#f6c3c1", "#fbe9a6"];
const FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

function cell(player: 0 | 1, p: number, pawn: number): [number, number] {
  if (p < 0) return BASE[player]![pawn]!;
  if (p >= TRACK) return HOME[player]![p - TRACK]!;
  return PATH[(p + START[player]) % TRACK]!;
}

/** Mens erger je niet: roll the die, then tap the pawn you want to move. */
export function LudoBoard({ state, me, myTurn, busy, onMove, seed = "" }: BoardProps<LudoState>) {
  const [roll, setRoll] = useState<number | null>(null);
  const [rolling, setRolling] = useState<number | null>(null);
  const playing = myTurn && me !== null && !busy;
  const movable = playing && roll ? ludoMovable(state, me!, roll) : [];

  useEffect(() => setRoll(null), [state]);

  // No pawn can move with this roll: show it for a moment, then pass on.
  useEffect(() => {
    if (!playing || !roll || movable.length) return;
    const t = setTimeout(() => {
      const r = ludoMove(state, me!, roll, null);
      if (r) onMove(r);
    }, 1400);
    return () => clearTimeout(t);
  }, [playing, roll, movable.length, state, me, onMove]);

  function throwDie() {
    if (!playing || roll || rolling) return;
    let n = 0;
    const t = setInterval(() => {
      n++;
      setRolling(((n * 7) % 6) + 1);
      if (n >= 8) {
        clearInterval(t);
        setRolling(null);
        setRoll(ludoRoll(seed));
        navigator.vibrate?.(25);
      }
    }, 70);
  }

  function pick(pawn: number) {
    if (!roll || !movable.includes(pawn)) return;
    const r = ludoMove(state, me!, roll, pawn);
    if (r) onMove(r);
  }

  const shownDie = rolling ?? roll ?? (state.last && state.last.by !== me ? state.last.roll : null);
  const homeCount = (p: 0 | 1) => state.pos[p].filter((x) => x >= TRACK).length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-center text-sm">
        {[0, 1].map((p) => (
          <div
            key={p}
            className={`rounded-2xl p-2 shadow-soft ${me === p ? "bg-primary/15" : "bg-card"}`}
          >
            <p className="flex items-center justify-center gap-1.5 text-lg font-bold">
              <span className="inline-block size-4 rounded-full" style={{ background: COLOR[p] }} />
              {homeCount(p as 0 | 1)} / 4
            </p>
            <p className="text-[11px] text-muted-foreground">pionnen binnen</p>
          </div>
        ))}
      </div>

      <svg
        viewBox="-0.3 -0.3 11.6 11.6"
        className="mx-auto block w-full max-w-sm select-none rounded-3xl bg-[#f3e7c9] shadow-soft"
      >
        {[0, 1].map((p) =>
          BASE[p]!.map(([c, r], i) => (
            <circle
              key={`b${p}${i}`}
              cx={c + 0.5}
              cy={r + 0.5}
              r={0.42}
              fill={LIGHT[p]}
              stroke={COLOR[p]}
              strokeWidth={0.06}
            />
          )),
        )}
        {PATH.map(([c, r], i) => {
          const start = i === START[0] ? 0 : i === START[1] ? 1 : null;
          return (
            <circle
              key={i}
              cx={c + 0.5}
              cy={r + 0.5}
              r={0.4}
              fill={start === null ? "#fff" : COLOR[start]}
              stroke="#2a1a14"
              strokeWidth={0.05}
            />
          );
        })}
        {[0, 1].map((p) =>
          HOME[p]!.map(([c, r], i) => (
            <circle
              key={`h${p}${i}`}
              cx={c + 0.5}
              cy={r + 0.5}
              r={0.4}
              fill={LIGHT[p]}
              stroke={COLOR[p]}
              strokeWidth={0.07}
            />
          )),
        )}
        {([0, 1] as const).map((p) =>
          state.pos[p].map((pos, i) => {
            const [c, r] = cell(p, pos, i);
            const can = p === me && movable.includes(i);
            return (
              <g
                key={`p${p}${i}`}
                onClick={() => p === me && pick(i)}
                style={{ cursor: can ? "pointer" : "default" }}
              >
                {can && (
                  <circle
                    cx={c + 0.5}
                    cy={r + 0.5}
                    r={0.48}
                    fill="none"
                    stroke="#2a1a14"
                    strokeWidth={0.08}
                    className="animate-pulse"
                  />
                )}
                <circle cx={c + 0.5} cy={r + 0.55} r={0.3} fill="#0003" />
                <circle
                  cx={c + 0.5}
                  cy={r + 0.45}
                  r={0.3}
                  fill={COLOR[p]}
                  stroke="#2a1a14"
                  strokeWidth={0.05}
                />
                <circle cx={c + 0.42} cy={r + 0.37} r={0.08} fill="#fff8" />
              </g>
            );
          }),
        )}
        {shownDie && (
          <text x={5.5} y={5.62} fontSize={1.6} textAnchor="middle" dominantBaseline="central">
            {FACES[shownDie - 1]}
          </text>
        )}
      </svg>

      {playing && (
        <div className="text-center">
          {!roll ? (
            <Button
              onClick={throwDie}
              disabled={!!rolling}
              className="h-14 w-full rounded-full text-lg"
            >
              🎲 {rolling ? "Gooien…" : "Gooi de dobbelsteen"}
            </Button>
          ) : (
            <p className="text-sm font-semibold">
              Je gooide {roll}!{" "}
              {movable.length
                ? "Tik op een pion die knippert."
                : roll === 6
                  ? "Geen zet mogelijk, je mag nog een keer."
                  : "Geen zet mogelijk."}
            </p>
          )}
          {!roll && state.tries > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Nog een poging om 6 te gooien ({state.tries + 1} van 3)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
