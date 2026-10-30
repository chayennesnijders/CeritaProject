import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  BALL_COLORS,
  BALL_R,
  POCKETS,
  POCKET_R,
  POOL_TO_WIN,
  TABLE,
  poolMove,
  simulate,
  type Ball,
  type PoolState,
} from "@/lib/chat-games/pool";
import type { MoveResult } from "@/lib/chat-games/types";
import type { BoardProps } from "./types";

const FPS = 30; // the simulation stores a frame every 1/30 s

/** Plays a list of ball positions as an animation, then calls `done`. */
function useReplay() {
  const [frame, setFrame] = useState<Ball[] | null>(null);
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  function play(frames: Ball[][], done?: () => void) {
    cancelAnimationFrame(raf.current);
    const t0 = performance.now();
    const tick = (now: number) => {
      const i = Math.floor(((now - t0) / 1000) * FPS);
      if (i >= frames.length - 1) {
        setFrame(null);
        done?.();
        return;
      }
      setFrame(frames[i]!);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }
  return { frame, play };
}

/** Pool: pull back from the white ball (like a slingshot) and let go to shoot. */
export function PoolTable({ state, me, myTurn, busy, onMove }: BoardProps<PoolState>) {
  const svg = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [shooting, setShooting] = useState(false);
  const { frame, play } = useReplay();
  const balls = frame ?? state.balls;
  const cue = balls.find((b) => b.id === 0)!;
  const canShoot = myTurn && me !== null && !busy && !shooting && !frame;

  const toTable = (e: React.PointerEvent) => {
    const m = svg.current!.getScreenCTM()!.inverse();
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
    return { x: p.x, y: p.y };
  };
  const aim = drag
    ? {
        angle: Math.atan2(cue.y - drag.y, cue.x - drag.x),
        power: Math.min(Math.hypot(cue.x - drag.x, cue.y - drag.y) / 0.6, 1),
      }
    : null;

  function release() {
    if (!aim || !canShoot) return setDrag(null);
    setDrag(null);
    if (aim.power < 0.06) return;
    setShooting(true);
    const r = poolMove(state, me!, aim.angle, aim.power);
    const { frames, ...result } = r;
    play(frames, () => {
      setShooting(false);
      onMove(result as MoveResult<PoolState>);
    });
  }

  function replayLast() {
    if (!state.last || !state.before) return;
    play(simulate(state.before, state.last.angle, state.last.power).frames);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-center text-sm">
        {[0, 1].map((p) => (
          <div
            key={p}
            className={`rounded-2xl p-2 shadow-soft ${me === p ? "bg-primary/15" : "bg-card"}`}
          >
            <p className="text-2xl font-bold">{state.scores[p]}</p>
            <p className="text-[11px] text-muted-foreground">van de {POOL_TO_WIN} ballen</p>
          </div>
        ))}
      </div>
      <div className="rounded-3xl bg-[#6b3e1f] p-2 shadow-soft">
        <svg
          ref={svg}
          viewBox={`0 0 ${TABLE.w} ${TABLE.h}`}
          className={`block w-full touch-none rounded-2xl bg-[#1f7a4a] ${canShoot ? "cursor-grab" : ""}`}
          onPointerDown={(e) => {
            if (!canShoot) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            setDrag(toTable(e));
          }}
          onPointerMove={(e) => drag && setDrag(toTable(e))}
          onPointerUp={release}
          onPointerCancel={() => setDrag(null)}
        >
          {POCKETS.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={POCKET_R} fill="#111" />
          ))}
          <line x1={0.5} y1={0.03} x2={0.5} y2={0.97} stroke="#ffffff22" strokeWidth={0.006} />
          {aim && (
            <>
              <line
                x1={cue.x}
                y1={cue.y}
                x2={cue.x + Math.cos(aim.angle) * 1.2}
                y2={cue.y + Math.sin(aim.angle) * 1.2}
                stroke="#ffffffaa"
                strokeWidth={0.008}
                strokeDasharray="0.03 0.02"
              />
              {/* the cue stick, pulled back further with more power */}
              <line
                x1={cue.x - Math.cos(aim.angle) * (BALL_R * 1.5 + aim.power * 0.25)}
                y1={cue.y - Math.sin(aim.angle) * (BALL_R * 1.5 + aim.power * 0.25)}
                x2={cue.x - Math.cos(aim.angle) * (BALL_R * 1.5 + aim.power * 0.25 + 0.9)}
                y2={cue.y - Math.sin(aim.angle) * (BALL_R * 1.5 + aim.power * 0.25 + 0.9)}
                stroke="#d9a066"
                strokeWidth={0.022}
                strokeLinecap="round"
              />
            </>
          )}
          {balls
            .filter((b) => !b.potted)
            .map((b) => (
              <g key={b.id}>
                <circle
                  cx={b.x}
                  cy={b.y}
                  r={BALL_R}
                  fill={BALL_COLORS[b.id]}
                  stroke="#0003"
                  strokeWidth={0.004}
                />
                {b.id > 0 && (
                  <>
                    <circle cx={b.x} cy={b.y} r={BALL_R * 0.5} fill="#fff" />
                    <text
                      x={b.x}
                      y={b.y}
                      fontSize={0.03}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontWeight={700}
                    >
                      {b.id}
                    </text>
                  </>
                )}
              </g>
            ))}
        </svg>
      </div>
      {aim && (
        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${aim.power * 100}%` }}
          />
        </div>
      )}
      {canShoot && !aim && (
        <p className="text-center text-xs text-muted-foreground">
          Sleep je vinger weg van de witte bal om te mikken. Hoe verder, hoe harder. Laat los om te
          stoten!
        </p>
      )}
      {!shooting && !frame && !aim && state.last && state.before && state.last.by !== me && (
        <Button variant="outline" className="w-full rounded-full" onClick={replayLast}>
          ▶️ Bekijk de laatste stoot
        </Button>
      )}
    </div>
  );
}
