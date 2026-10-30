import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DART_NUMBERS,
  DART_ROUNDS,
  RINGS,
  dartScore,
  dartsMove,
  dartsTotal,
  type Dart,
  type DartsState,
} from "@/lib/chat-games/darts";
import type { BoardProps } from "./types";

const rad = (deg: number) => (deg * Math.PI) / 180;
const pt = (r: number, deg: number) => `${r * Math.sin(rad(deg))} ${-r * Math.cos(rad(deg))}`;
/** Ring slice between two radii, `deg` = centre of the number, 18° wide. */
function slice(r1: number, r2: number, deg: number) {
  const a = deg - 9;
  const b = deg + 9;
  return `M ${pt(r1, a)} L ${pt(r2, a)} A ${r2} ${r2} 0 0 1 ${pt(r2, b)} L ${pt(r1, b)} A ${r1} ${r1} 0 0 0 ${pt(r1, a)} Z`;
}

function Board({ darts, aim }: { darts: Dart[]; aim: { x: number; y: number } | null }) {
  return (
    <svg viewBox="-1.25 -1.25 2.5 2.5" className="mx-auto aspect-square w-full max-w-xs">
      <circle r={1.22} fill="#1b1b1b" />
      {DART_NUMBERS.map((n, k) => {
        const deg = k * 18;
        const dark = k % 2 === 0;
        const ring = dark ? "#e53935" : "#2e7d32";
        return (
          <g key={n}>
            <path
              d={slice(RINGS.outerBull, RINGS.tripleIn, deg)}
              fill={dark ? "#222" : "#f3e7c9"}
            />
            <path d={slice(RINGS.tripleIn, RINGS.tripleOut, deg)} fill={ring} />
            <path
              d={slice(RINGS.tripleOut, RINGS.doubleIn, deg)}
              fill={dark ? "#222" : "#f3e7c9"}
            />
            <path d={slice(RINGS.doubleIn, 1, deg)} fill={ring} />
            <text
              x={1.11 * Math.sin(rad(deg))}
              y={-1.11 * Math.cos(rad(deg))}
              fontSize={0.11}
              fill="#fff"
              textAnchor="middle"
              dominantBaseline="central"
              fontWeight={700}
            >
              {n}
            </text>
          </g>
        );
      })}
      <circle r={RINGS.outerBull} fill="#2e7d32" />
      <circle r={RINGS.bull} fill="#e53935" />
      {darts.map((d, i) => (
        <g key={i} className="animate-in zoom-in-50">
          <circle cx={d.x} cy={d.y} r={0.035} fill="#f5c518" stroke="#000" strokeWidth={0.012} />
          <line
            x1={d.x}
            y1={d.y}
            x2={d.x + 0.07}
            y2={d.y + 0.12}
            stroke="#f5c518"
            strokeWidth={0.02}
          />
        </g>
      ))}
      {aim && (
        <g stroke="#fff" strokeWidth={0.018} fill="none">
          <circle cx={aim.x} cy={aim.y} r={0.07} />
          <line x1={aim.x - 0.11} y1={aim.y} x2={aim.x + 0.11} y2={aim.y} />
          <line x1={aim.x} y1={aim.y - 0.11} x2={aim.x} y2={aim.y + 0.11} />
        </g>
      )}
    </svg>
  );
}

/** The aim moves over the board by itself; tap "Gooi!" at the right moment. */
export function DartsBoard({ state, me, myTurn, busy, onMove }: BoardProps<DartsState>) {
  const [thrown, setThrown] = useState<Dart[]>([]);
  const [aim, setAim] = useState({ x: 0, y: 0 });
  const aimRef = useRef(aim);
  const playing = myTurn && me !== null && !busy;

  useEffect(() => {
    if (!playing || thrown.length >= 3) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = (now - t0) / 1000;
      // Speeds up a little with every dart, so the last one is the hardest.
      const s = 1 + thrown.length * 0.25;
      const next = { x: 0.8 * Math.sin(t * 1.5 * s), y: 0.8 * Math.sin(t * 2.1 * s + 0.7) };
      aimRef.current = next;
      setAim(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, thrown.length]);

  useEffect(() => setThrown([]), [state]);

  function toss() {
    if (!playing || thrown.length >= 3) return;
    const { x, y } = aimRef.current;
    const next = [...thrown, { x, y, ...dartScore(x, y) }];
    setThrown(next);
    navigator.vibrate?.(20);
    if (next.length === 3) {
      const r = dartsMove(state, me!, next);
      if (r) setTimeout(() => onMove(r), 900);
    }
  }

  const shown = playing || thrown.length ? thrown : (state.last ?? []);
  const round = Math.min(state.rounds[me ?? 0]!.length + 1, DART_ROUNDS);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-center text-sm">
        {[0, 1].map((p) => (
          <div
            key={p}
            className={`rounded-2xl p-2 ${me === p ? "bg-primary/15" : "bg-card"} shadow-soft`}
          >
            <p className="text-2xl font-bold">{dartsTotal(state, p as 0 | 1)}</p>
            <p className="text-[11px] text-muted-foreground">
              Rondes: {state.rounds[p]!.join(" + ") || "–"}
            </p>
          </div>
        ))}
      </div>
      <div onClick={toss} className={playing && thrown.length < 3 ? "cursor-crosshair" : ""}>
        <Board darts={shown} aim={playing && thrown.length < 3 ? aim : null} />
      </div>
      <div className="flex min-h-6 flex-wrap justify-center gap-2 text-sm">
        {shown.map((d, i) => (
          <span key={i} className="rounded-full bg-card px-3 py-1 font-semibold shadow-soft">
            🎯 {d.label}
          </span>
        ))}
      </div>
      {playing && (
        <Button
          onClick={toss}
          disabled={thrown.length >= 3}
          className="h-14 w-full rounded-full text-lg"
        >
          {thrown.length >= 3
            ? "Mooi gegooid!"
            : `Gooi! (pijl ${thrown.length + 1} van 3, ronde ${round})`}
        </Button>
      )}
    </div>
  );
}
