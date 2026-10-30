import { useEffect, useRef, useState } from "react";
import {
  DART_NUMBERS,
  DART_ROUNDS,
  RINGS,
  DART_START,
  dartAim,
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

function Board({
  darts,
  aim,
  dart,
  svgRef,
  handlers,
}: {
  darts: Dart[];
  aim: { x: number; y: number } | null;
  /** The dart in your hand (or flying), null when you can't throw. */
  dart: { x: number; y: number; flying: boolean } | null;
  svgRef?: React.Ref<SVGSVGElement>;
  handlers?: React.SVGProps<SVGSVGElement> | undefined;
}) {
  return (
    <svg
      ref={svgRef}
      viewBox="-1.25 -1.25 2.5 3.3"
      className={`mx-auto block w-full max-w-xs select-none ${dart ? "touch-none" : ""}`}
      {...handlers}
    >
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
        <g stroke="#fff" strokeWidth={0.018} fill="none" opacity={0.9}>
          <circle cx={aim.x} cy={aim.y} r={0.08} strokeDasharray="0.03 0.025" />
          <circle cx={aim.x} cy={aim.y} r={0.015} fill="#fff" />
        </g>
      )}
      {dart && (
        <g
          style={{
            transform: `translate(${dart.x}px, ${dart.y}px) scale(${dart.flying ? 0.55 : 1})`,
            transition: dart.flying ? "transform 0.32s cubic-bezier(.2,.7,.3,1)" : "none",
          }}
        >
          {/* a dart pointing up: tip, barrel, flights */}
          <line x1={0} y1={-0.16} x2={0} y2={0.02} stroke="#bbb" strokeWidth={0.018} />
          <rect x={-0.03} y={0.02} width={0.06} height={0.16} rx={0.02} fill="#e7a4a9" />
          <path d="M 0 0.16 L -0.09 0.3 L 0 0.26 L 0.09 0.3 Z" fill="#d9667a" />
        </g>
      )}
    </svg>
  );
}

/** Pull the dart back (down), aim and let go: like a slingshot, just as in pool. */
export function DartsBoard({ state, me, myTurn, busy, onMove }: BoardProps<DartsState>) {
  const svg = useRef<SVGSVGElement>(null);
  const [thrown, setThrown] = useState<Dart[]>([]);
  const [drag, setDrag] = useState<{
    start: { x: number; y: number };
    now: { x: number; y: number };
  } | null>(null);
  const [flight, setFlight] = useState<{ x: number; y: number; flying: boolean } | null>(null);
  const playing = myTurn && me !== null && !busy;
  const canThrow = playing && thrown.length < 3 && !flight;

  useEffect(() => setThrown([]), [state]);

  const toBoard = (e: React.PointerEvent) => {
    const m = svg.current!.getScreenCTM()!.inverse();
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
    return { x: p.x, y: p.y };
  };
  const pull = drag ? { x: drag.now.x - drag.start.x, y: drag.now.y - drag.start.y } : null;
  const aim = pull ? dartAim(pull) : null;

  function release() {
    if (!drag || !pull || !aim) return;
    setDrag(null);
    if (aim.power < 0.08) return; // just a tap: nothing thrown
    const hit = dartAim(pull, [Math.random() * 2 - 1, Math.random() * 2 - 1]);
    const from = {
      x: DART_START.x + Math.max(-0.4, Math.min(0.4, pull.x)),
      y: DART_START.y + Math.min(0.15, Math.max(0, pull.y)),
    };
    setFlight({ ...from, flying: false });
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setFlight({ x: hit.x, y: hit.y, flying: true })),
    );
    setTimeout(() => {
      setFlight(null);
      const next = [...thrown, { x: hit.x, y: hit.y, ...dartScore(hit.x, hit.y) }];
      setThrown(next);
      navigator.vibrate?.(20);
      if (next.length === 3) {
        const r = dartsMove(state, me!, next);
        if (r) setTimeout(() => onMove(r), 900);
      }
    }, 340);
  }

  // The dart in your hand follows your finger a little while you pull back.
  const hand = canThrow
    ? pull
      ? {
          x: DART_START.x + Math.max(-0.4, Math.min(0.4, pull.x)),
          y: DART_START.y + Math.min(0.15, Math.max(0, pull.y)),
          flying: false,
        }
      : { ...DART_START, flying: false }
    : null;
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
      <Board
        darts={shown}
        aim={aim}
        dart={flight ?? hand}
        svgRef={svg}
        handlers={
          canThrow
            ? {
                onPointerDown: (e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  const p = toBoard(e);
                  setDrag({ start: p, now: p });
                },
                onPointerMove: (e) => drag && setDrag({ ...drag, now: toBoard(e) }),
                onPointerUp: release,
                onPointerCancel: () => setDrag(null),
              }
            : undefined
        }
      />
      {aim && (
        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${aim.power * 100}%` }}
          />
        </div>
      )}
      <div className="flex min-h-6 flex-wrap justify-center gap-2 text-sm">
        {shown.map((d, i) => (
          <span key={i} className="rounded-full bg-card px-3 py-1 font-semibold shadow-soft">
            🎯 {d.label}
          </span>
        ))}
      </div>
      {playing && (
        <p className="text-center text-sm font-semibold">
          {thrown.length >= 3
            ? "Mooi gegooid!"
            : drag
              ? "Laat los om te gooien!"
              : `Pijl ${thrown.length + 1} van 3 · ronde ${round}: zet je vinger op het bord en trek naar beneden`}
        </p>
      )}
    </div>
  );
}
