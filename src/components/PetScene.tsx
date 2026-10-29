// Elke achtergrond is een echt plekje: lucht, grond en spullen die erbij horen.
// Alles staat in één SVG van 360x340 die de hele diertjes-pool vult, zodat het
// diertje midden in de scène staat in plaats van voor een gekleurd vlak.
import type { ReactElement } from "react";

const W = 360;
const H = 340;
const GROUND = 150;

function Sun({ x, y, r = 20, c = "#ffd97a" }: { x: number; y: number; r?: number; c?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r * 1.8} fill={c} opacity="0.25" />
      <circle cx={x} cy={y} r={r} fill={c} />
    </g>
  );
}

function Cloud({ x, y, s = 1, o = 0.92, c = "#ffffff" }: { x: number; y: number; s?: number; o?: number; c?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
      <g className="scene-drift" fill={c}>
        <ellipse cx="0" cy="0" rx="18" ry="9" />
        <ellipse cx="15" cy="-6" rx="14" ry="10" />
        <ellipse cx="29" cy="1" rx="15" ry="8" />
      </g>
    </g>
  );
}

function Tulip({ x, y, c, s = 1 }: { x: number; y: number; c: string; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="scene-sway">
        <path d="M0 0 L0 -18" stroke="#4f8a3d" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M0 -9 q-8 -2 -9 -9 q8 1 9 6z" fill="#5aa046" />
        <path d="M-6 -17 q-1 -10 6 -10 q7 0 6 10 q-3 -4 -6 -4 q-3 0 -6 4z" fill={c} />
      </g>
    </g>
  );
}

function Daisy({ x, y, c = "#fffaf0", s = 1 }: { x: number; y: number; c?: string; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="scene-sway">
        <path d="M0 0 L0 -13" stroke="#4f8a3d" strokeWidth="2" strokeLinecap="round" fill="none" />
        {[0, 45, 90, 135].map((a) => (
          <ellipse key={a} cx="0" cy="-19" rx="3" ry="5.5" fill={c} transform={`rotate(${a} 0 -19)`} />
        ))}
        <circle cx="0" cy="-19" r="3" fill="#f2c14a" />
      </g>
    </g>
  );
}

function Blades({ n, y, color }: { n: number; y: number; color: string }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const x = (i * W) / n + (i % 4) * 3;
        const h = 6 + (i % 4) * 3;
        return <path key={i} d={`M${x} ${y} q2 -${h} 5 -${h + 2}`} stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" />;
      })}
    </g>
  );
}

function Fir({ x, y, s = 1, snow = false }: { x: number; y: number; s?: number; snow?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-4" y="-6" width="8" height="14" rx="2" fill="#6b4630" />
      <path d="M0 -58 L20 -22 L-20 -22z" fill="#3f7a48" />
      <path d="M0 -44 L24 -6 L-24 -6z" fill="#4a8b52" />
      {snow && <path d="M0 -58 L10 -38 L-10 -38z" fill="#f4fbff" />}
      {snow && <path d="M0 -44 L12 -24 L-12 -24z" fill="#f4fbff" opacity="0.85" />}
    </g>
  );
}

function Tuin() {
  return (
    <>
      <defs>
        <linearGradient id="tuinSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bfe3f5" />
          <stop offset="1" stopColor="#f0f9ff" />
        </linearGradient>
        <linearGradient id="tuinGras" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a3d67e" />
          <stop offset="1" stopColor="#6aa84e" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#tuinSky)" />
      <Sun x={302} y={44} r={21} />
      <Cloud x={52} y={42} />
      <Cloud x={188} y={66} s={0.7} o={0.8} />
      {/* houten schutting achterin */}
      <g fill="#cf9f6f" stroke="#a97a4d" strokeWidth="1">
        {Array.from({ length: 18 }, (_, i) => <rect key={i} x={i * 20 + 2} y={94} width={16} height={56} rx={3} />)}
        <rect x={0} y={106} width={W} height={6} stroke="none" />
        <rect x={0} y={132} width={W} height={6} stroke="none" />
      </g>
      {/* gras */}
      <path d={`M0 ${GROUND - 6} q90 -8 180 -2 q90 6 180 0 L${W} ${H} L0 ${H} z`} fill="url(#tuinGras)" />
      <path d={`M0 ${GROUND + 40} q120 -16 240 -2 q60 6 120 -6 L${W} ${H} L0 ${H} z`} fill="#7cbb5c" />
      <path d={`M0 ${GROUND + 118} q120 -14 240 -2 q60 6 120 -6 L${W} ${H} L0 ${H} z`} fill="#8ac96a" />
      <Blades n={26} y={GROUND + 16} color="#5f9b45" />
      <Blades n={20} y={GROUND + 134} color="#6aa84e" />


      {/* bloemetjespad */}
      <ellipse cx={180} cy={GROUND + 104} rx={78} ry={18} fill="#efe0c4" opacity="0.9" />
      <ellipse cx={148} cy={GROUND + 84} rx={26} ry={8} fill="#e4d1ae" opacity="0.85" />
      <ellipse cx={214} cy={GROUND + 94} rx={22} ry={7} fill="#e4d1ae" opacity="0.8" />
      {/* boom met roze bloesem */}
      <g transform="translate(44 178)">
        <rect x="-7" y="-42" width="14" height="54" rx="5" fill="#8a5a3c" />
        <g className="scene-sway">
          <circle cx="0" cy="-60" r="31" fill="#6fae52" />
          <circle cx="-23" cy="-44" r="21" fill="#7cbb5c" />
          <circle cx="23" cy="-46" r="20" fill="#7cbb5c" />
          {[[-14, -74], [8, -66], [-26, -48], [20, -52], [2, -42], [-6, -58]].map(([bx, by], i) => (
            <circle key={i} cx={bx} cy={by} r="4.5" fill="#f2a6bd" />
          ))}
        </g>
      </g>
      {/* struik en bloemen */}
      <ellipse cx={330} cy={GROUND + 10} rx={30} ry={16} fill="#5f9b45" />
      {[
        [40, GROUND + 34, "#ef7fa6"], [78, GROUND + 58, "#f7d154"], [300, GROUND + 38, "#ef7fa6"],
        [334, GROUND + 62, "#fffaf0"], [58, GROUND + 88, "#f7d154"], [312, GROUND + 94, "#ef7fa6"],
      ].map(([x, y, c], i) => <Tulip key={i} x={x as number} y={y as number} c={c as string} s={i % 2 ? 1.1 : 0.9} />)}
      {[
        [20, GROUND + 66], [104, GROUND + 96], [268, GROUND + 100], [348, GROUND + 76],
        [92, GROUND + 142], [286, GROUND + 150], [14, GROUND + 124],
      ].map(([x, y], i) => <Daisy key={i} x={x as number} y={y as number} s={i % 2 ? 1 : 0.85} />)}

      {/* vlinder + bloesemblaadjes */}
      <g transform="translate(258 108)">
        <g className="scene-flap">
          <ellipse cx="-6" cy="0" rx="6" ry="8" fill="#f2a6bd" />
          <ellipse cx="6" cy="0" rx="6" ry="8" fill="#fbdce6" />
          <rect x="-1.2" y="-6" width="2.4" height="12" rx="1.2" fill="#3a2a20" />
        </g>
      </g>
      {[
        [70, 40], [150, 26], [236, 52], [300, 30],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <ellipse className="scene-fall" cx="0" cy="0" rx="4" ry="3" fill="#f7c3d2" style={{ animationDelay: `${i * 1.4}s` }} />
        </g>
      ))}

    </>
  );
}

function Kamer() {
  return (
    <>
      <defs>
        <linearGradient id="kamerMuur" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a4a3a" />
          <stop offset="1" stopColor="#553226" />
        </linearGradient>
        <linearGradient id="kamerVloer" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a8724a" />
          <stop offset="1" stopColor="#7d4f31" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#kamerMuur)" />
      {Array.from({ length: 9 }, (_, i) => <rect key={i} x={i * 40} width={20} height={GROUND} fill="#ffffff" opacity="0.05" />)}
      {/* vloer */}
      <rect y={GROUND} width={W} height={H - GROUND} fill="url(#kamerVloer)" />
      {Array.from({ length: 7 }, (_, i) => <rect key={i} x={i * 52} y={GROUND} width={48} height={H - GROUND} fill="#000000" opacity="0.13" rx={3} />)}
      <rect y={GROUND + 46} width={W} height={3} fill="#000000" opacity="0.1" />
      <rect y={GROUND + 110} width={W} height={3} fill="#000000" opacity="0.1" />
      <rect y={GROUND - 8} width={W} height={8} fill="#3f2418" />

      {/* raam met uitzicht */}
      <g transform="translate(236 34)">

        <rect x="-4" y="-4" width={106} height={92} rx={8} fill="#3f2418" />
        <rect width={98} height={84} rx={5} fill="#bfe3f5" />
        <circle cx={72} cy={22} r={12} fill="#ffd97a" />
        <path d="M0 62 q24 -16 50 -4 q26 12 48 -6 L98 84 L0 84z" fill="#8ec96f" />
        <line x1={49} y1={0} x2={49} y2={84} stroke="#3f2418" strokeWidth={5} />
        <line x1={0} y1={42} x2={98} y2={42} stroke="#3f2418" strokeWidth={5} />
      </g>
      {/* schilderijtje */}
      <g transform="translate(64 46)">

        <rect x="-4" y="-4" width={58} height={46} rx={4} fill="#e9d3b4" />
        <rect width={50} height={38} rx={2} fill="#f7d7e2" />
        <circle cx={25} cy={19} r={9} fill="#ef7fa6" />
      </g>
      {/* bank */}
      <g transform="translate(52 196)">

        <rect x={-6} y={-30} width={120} height={26} rx={12} fill="#c96a7f" />
        <rect x={-14} y={-14} width={136} height={26} rx={12} fill="#b85a70" />
        <rect x={-14} y={-14} width={16} height={34} rx={8} fill="#a84d62" />
        <rect x={106} y={-14} width={16} height={34} rx={8} fill="#a84d62" />
        <rect x={6} y={-26} width={34} height={16} rx={6} fill="#f2a6bd" />
      </g>
      {/* kleed */}
      <ellipse cx={190} cy={GROUND + 46} rx={96} ry={22} fill="#e9d3b4" opacity="0.9" />
      <ellipse cx={190} cy={GROUND + 46} rx={70} ry={15} fill="#f7d7e2" opacity="0.9" />
      {/* staande lamp */}
      <g transform="translate(330 200)">
        <rect x={-2} y={-56} width={4} height={62} fill="#3f2418" />
        <path d="M-16 -56 L16 -56 L10 -78 L-10 -78z" fill="#f7d154" />
        <ellipse cx={0} cy={8} rx={14} ry={4} fill="#3f2418" />
      </g>
      {/* plant */}
      <g transform="translate(126 214)">
        <path d="M0 0 q-14 -18 -6 -34 q10 12 6 34" fill="#4a8b52" />
        <path d="M0 0 q14 -20 6 -36 q-12 14 -6 36" fill="#5aa046" />
        <path d="M-10 0 L10 0 L7 16 L-7 16z" fill="#c07a4a" />
      </g>
    </>
  );
}

function Strand() {
  return (
    <>
      <defs>
        <linearGradient id="strandSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fd3f4" />
          <stop offset="1" stopColor="#e8f8ff" />
        </linearGradient>
        <linearGradient id="strandZee" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3fa9d8" />
          <stop offset="1" stopColor="#7fd0ea" />
        </linearGradient>
        <linearGradient id="strandZand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6dfa8" />
          <stop offset="1" stopColor="#e2c07f" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#strandSky)" />
      <Sun x={58} y={48} r={22} c="#ffe08a" />
      <Cloud x={230} y={40} s={0.8} o={0.85} />
      {/* meeuwen */}
      <g stroke="#4a4a4a" strokeWidth="2" fill="none" strokeLinecap="round">
        <path d="M150 62 q8 -7 16 0 q8 -7 16 0" />
        <path d="M196 84 q6 -5 12 0 q6 -5 12 0" />
      </g>
      {/* zee */}
      <rect y={108} width={W} height={54} fill="url(#strandZee)" />
      {Array.from({ length: 8 }, (_, i) => (
        <path key={i} d={`M${i * 46} ${116 + (i % 3) * 12} q11 -7 22 0 q11 7 22 0`} stroke="#ffffff" strokeWidth="2.5" fill="none" opacity="0.65" />
      ))}

      {/* zand */}
      <path d={`M0 ${GROUND - 12} q100 -16 200 -2 q80 12 160 -8 L${W} ${H} L0 ${H} z`} fill="url(#strandZand)" />
      <path d={`M0 ${GROUND + 6} q100 -12 200 0 q80 10 160 -6 L${W} ${GROUND + 26} L0 ${GROUND + 26}z`} fill="#e8cf9b" opacity="0.8" />
      <path d={`M0 ${GROUND + 96} q120 -14 240 -2 q60 6 120 -6 L${W} ${H} L0 ${H} z`} fill="#e0bd7c" />
      {Array.from({ length: 40 }, (_, i) => (
        <circle key={i} cx={(i * 37) % W} cy={GROUND + 12 + (i % 6) * 14} r="1.6" fill="#c9a25f" opacity="0.7" />
      ))}
      {Array.from({ length: 24 }, (_, i) => (
        <circle key={i} cx={(i * 53 + 17) % W} cy={GROUND + 108 + (i % 4) * 16} r="1.8" fill="#b9955c" opacity="0.6" />
      ))}

      {/* palm */}
      <g transform="translate(50 186)">
        <ellipse cx="6" cy="6" rx="28" ry="7" fill="#000000" opacity="0.12" />
        <path d="M0 0 q-6 -40 6 -70" stroke="#8a5a3c" strokeWidth="9" fill="none" strokeLinecap="round" />

        <g transform="translate(6 -70)">
          <g className="scene-sway">
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <path key={a} d="M0 0 q22 -10 40 -2 q-20 10 -40 8z" fill="#3f8f52" transform={`rotate(${a})`} />
            ))}
            <circle cx="0" cy="0" r="6" fill="#8a5a3c" />
          </g>
        </g>
      </g>
      {/* parasol */}
      <g transform="translate(300 196)">
        <ellipse cx="0" cy="6" rx="36" ry="8" fill="#000000" opacity="0.12" />
        <rect x={-2} y={-58} width={4} height={62} fill="#8a5a3c" />

        <path d="M-40 -58 q40 -30 80 0z" fill="#ef7fa6" />
        <path d="M-40 -58 q20 -22 40 -22 q20 0 40 22z" fill="#fffaf0" opacity="0.55" />
      </g>
      {/* strandbal, zeester, schelp */}
      <g transform={`translate(150 ${GROUND + 30})`}>
        <circle cx="0" cy="0" r="13" fill="#fffaf0" />
        <path d="M-13 0 a13 13 0 0 1 26 0z" fill="#ef7fa6" />
        <path d="M0 -13 a13 13 0 0 1 0 26z" fill="#7fd0ea" opacity="0.8" />
      </g>
      <g transform={`translate(232 ${GROUND + 34})`}>
        <path d="M0 -12 L3.5 -3.5 L12 -3.5 L5.5 2 L8 11 L0 5.5 L-8 11 L-5.5 2 L-12 -3.5 L-3.5 -3.5z" fill="#f09a6a" />
      </g>
      <g transform={`translate(96 ${GROUND + 46})`} fill="#f7d7e2">
        <path d="M0 0 q10 -14 20 0z" />
        <path d="M4 -2 v-8 M10 -3 v-9 M16 -2 v-8" stroke="#e0b7c6" strokeWidth="1.5" />
      </g>
      <g transform={`translate(58 ${GROUND + 126})`} fill="#f7d7e2">
        <path d="M0 0 q12 -16 24 0z" />
        <path d="M5 -2 v-9 M12 -3 v-10 M19 -2 v-9" stroke="#e0b7c6" strokeWidth="1.5" />
      </g>
      <g transform={`translate(302 ${GROUND + 136})`}>
        <path d="M0 -11 L3 -3 L11 -3 L5 2 L7 10 L0 5 L-7 10 L-5 2 L-11 -3 L-3 -3z" fill="#f09a6a" />
      </g>

    </>
  );
}

function Snoep() {
  return (
    <>
      <defs>
        <linearGradient id="snoepSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbc7d9" />
          <stop offset="1" stopColor="#fdeef5" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#snoepSky)" />
      <Cloud x={60} y={48} c="#fff6fa" />
      <Cloud x={236} y={70} s={0.8} c="#fff6fa" />
      {/* snoephopen */}
      <path d={`M0 ${GROUND - 10} q90 -40 180 -12 q90 26 180 -16 L${W} ${H} L0 ${H} z`} fill="#f9a8c4" />
      <path d={`M0 ${GROUND + 24} q120 -22 240 -6 q60 8 120 -10 L${W} ${H} L0 ${H} z`} fill="#f7d7e2" />
      {/* chocoladerivier */}
      <path d={`M0 ${GROUND + 44} q90 16 180 2 q90 -14 180 6 L${W} ${GROUND + 66} L0 ${GROUND + 66}z`} fill="#6b4630" opacity="0.85" />
      <path d={`M0 ${GROUND + 96} q120 -14 240 -2 q60 6 120 -6 L${W} ${H} L0 ${H} z`} fill="#f9bcd6" />

      {/* lolly's */}
      {[
        [70, GROUND + 6, "#ef7fa6"], [300, GROUND + 12, "#7fd0ea"], [126, GROUND + 40, "#f7d154"],
      ].map(([x, y, c], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <rect x={-2} y={-30} width={4} height={32} rx={2} fill="#fffaf0" />
          <circle cx="0" cy="-44" r="16" fill={c as string} />
          <path d="M-10 -44 a10 10 0 1 1 6 9" stroke="#fffaf0" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
        </g>
      ))}
      {/* cupcake */}
      <g transform={`translate(238 ${GROUND + 16})`}>
        <path d="M-16 0 L16 0 L11 22 L-11 22z" fill="#c07a4a" />
        <circle cx="-8" cy="-4" r="9" fill="#fffaf0" />
        <circle cx="8" cy="-4" r="9" fill="#fffaf0" />
        <circle cx="0" cy="-12" r="9" fill="#f2a6bd" />
        <circle cx="0" cy="-20" r="3.5" fill="#ef4f6f" />
      </g>
      {/* sugarchips */}
      {Array.from({ length: 26 }, (_, i) => {
        const x = (i * 41) % W;
        const y = GROUND + 20 + (i % 9) * 16;
        const cols = ["#ef7fa6", "#7fd0ea", "#f7d154", "#a8e6a1"];
        return <rect key={i} x={x} y={y} width={7} height={3} rx={1.5} fill={cols[i % 4]} transform={`rotate(${(i * 37) % 180} ${x} ${y})`} />;
      })}
    </>
  );
}

function Sterren() {
  return (
    <>
      <defs>
        <linearGradient id="sterSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#141a38" />
          <stop offset="1" stopColor="#4b3b78" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#sterSky)" />
      {/* maan */}
      <circle cx={292} cy={58} r={38} fill="#f7f0d8" opacity="0.18" />
      <circle cx={292} cy={58} r={26} fill="#f7f0d8" />
      <circle cx={284} cy={50} r={5} fill="#e2d8bb" />
      <circle cx={299} cy={66} r={4} fill="#e2d8bb" />
      {/* sterren */}
      {Array.from({ length: 34 }, (_, i) => {
        const x = (i * 67) % W;
        const y = 12 + (i * 31) % 150;
        const r = i % 5 === 0 ? 2.4 : 1.4;
        return <circle key={i} className="scene-twinkle" cx={x} cy={y} r={r} fill="#fff8e2" style={{ animationDelay: `${(i % 7) * 0.4}s` }} />;
      })}
      {/* vallende ster */}
      <g transform="translate(110 40)">
        <g className="scene-fall">
          <line x1="0" y1="0" x2="34" y2="14" stroke="#fff8e2" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
          <circle cx="34" cy="14" r="3" fill="#fff8e2" />
        </g>
      </g>
      {/* heuvels */}
      <path d={`M0 ${GROUND} q90 -34 180 -12 q90 22 180 -14 L${W} ${H} L0 ${H} z`} fill="#2a2350" />
      <path d={`M0 ${GROUND + 30} q120 -20 240 -6 q60 8 120 -10 L${W} ${H} L0 ${H} z`} fill="#1d1a3c" />
      <path d={`M0 ${GROUND + 108} q120 -14 240 -2 q60 6 120 -6 L${W} ${H} L0 ${H} z`} fill="#151233" />
      {/* graspluizen */}
      {Array.from({ length: 14 }, (_, i) => {
        const x = 12 + (i * 27) % (W - 20);
        const y = GROUND + 118 + (i % 3) * 14;
        return <path key={i} d={`M${x} ${y} q3 -10 6 -12 M${x + 5} ${y} q0 -12 3 -14`} stroke="#3b3268" strokeWidth="1.8" fill="none" strokeLinecap="round" />;
      })}

      {/* vuurvliegjes */}
      {Array.from({ length: 9 }, (_, i) => {
        const x = 24 + (i * 41) % (W - 40);
        const y = GROUND - 10 - (i % 4) * 22;
        return (
          <g key={i}>
            <circle className="scene-twinkle" cx={x} cy={y} r={5} fill="#ffe98a" opacity="0.25" style={{ animationDelay: `${i * 0.3}s` }} />
            <circle className="scene-twinkle" cx={x} cy={y} r={2} fill="#fff3b0" style={{ animationDelay: `${i * 0.3}s` }} />
          </g>
        );
      })}
    </>
  );
}

function Sneeuw() {
  return (
    <>
      <defs>
        <linearGradient id="sneeuwSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfe3f2" />
          <stop offset="1" stopColor="#f4fbff" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#sneeuwSky)" />
      <Sun x={306} y={50} r={18} c="#fff6dd" />
      <Cloud x={70} y={46} c="#ffffff" />
      {/* besneeuwde heuvels */}
      <path d={`M0 ${GROUND - 8} q90 -30 180 -8 q90 20 180 -14 L${W} ${H} L0 ${H} z`} fill="#ffffff" />
      <path d={`M0 ${GROUND + 26} q120 -22 240 -6 q60 8 120 -10 L${W} ${H} L0 ${H} z`} fill="#f7fcff" />
      <path d={`M0 ${GROUND + 24} q120 -22 240 -6 q60 8 120 -10`} stroke="#dceaf7" strokeWidth="3" fill="none" />
      <path d={`M0 ${GROUND + 96} q120 -16 240 -2 q60 8 120 -8 L${W} ${H} L0 ${H} z`} fill="#ffffff" />
      {/* sneeuwbulten */}
      {Array.from({ length: 8 }, (_, i) => (
        <ellipse key={i} cx={24 + (i * 47) % (W - 30)} cy={GROUND + 112 + (i % 3) * 18} rx={22 - (i % 3) * 5} ry={7} fill="#eef7fd" />
      ))}

      {/* dennen */}
      <Fir x={54} y={GROUND + 8} s={1.05} snow />
      <Fir x={104} y={GROUND + 22} s={0.75} snow />
      <Fir x={348} y={GROUND + 14} s={0.9} snow />
      <Fir x={40} y={GROUND + 130} s={0.6} snow />
      {/* sneeuwpop */}
      <g transform={`translate(286 ${GROUND})`}>

        <circle cx="0" cy={30} r="22" fill="#ffffff" />
        <circle cx="0" cy={2} r="16" fill="#ffffff" />
        <circle cx="0" cy={-20} r="11" fill="#ffffff" />
        <circle cx="-4" cy={-22} r="1.8" fill="#3a2a20" />
        <circle cx="4" cy={-22} r="1.8" fill="#3a2a20" />
        <path d="M0 -18 l10 3 l-10 3z" fill="#f09a6a" />
        <rect x={-13} y={-32} width={26} height={5} rx={2} fill="#3a2a20" />
        <rect x={-8} y={-44} width={16} height={12} rx={2} fill="#3a2a20" />
        <path d="M-16 4 L-30 -6 M16 4 L30 -6" stroke="#8a5a3c" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      {/* sneeuwvlokken */}
      {Array.from({ length: 12 }, (_, i) => {
        const x = 16 + (i * 29) % (W - 24);
        const y = 20 + (i * 23) % 90;
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <circle className="scene-fall" cx="0" cy="0" r={i % 3 === 0 ? 3 : 2} fill="#ffffff" style={{ animationDelay: `${(i % 6) * 1}s` }} />
          </g>
        );
      })}
    </>
  );
}

// Het huisje hoort bij het diertje: het staat op de grond in dezelfde scène,
// met een schaduw eronder, in plaats van als los plaatje ergens te zweven.
function House({ id }: { id: string }) {
  const x = 296;
  const y = GROUND + 62;
  const shadowDefs = (
    <defs>
      <radialGradient id="houseShadow" cx="50%" cy="50%" r="50%">
        <stop offset="0" stopColor="#000000" stopOpacity="0.3" />
        <stop offset="65%" stopColor="#000000" stopOpacity="0.16" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
  const shadow = (
    <>
      {shadowDefs}
      <ellipse cx={x} cy={y + 2} rx={54} ry={13} fill="url(#houseShadow)" />
    </>
  );


  if (id === "mand") {
    return (
      <g>
        {shadow}
        <path d={`M${x - 30} ${y - 4} L${x - 24} ${y - 26} L${x + 24} ${y - 26} L${x + 30} ${y - 4} z`} fill="#c07a4a" />
        <path d={`M${x - 32} ${y - 26} q32 -12 64 0 q-32 8 -64 0z`} fill="#d9955f" />
        <path d={`M${x - 26} ${y - 14} h52`} stroke="#a3603a" strokeWidth="2.5" />
        <path d={`M${x - 12} ${y - 27} q12 -9 24 0`} stroke="#f2a6bd" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
    );
  }
  if (id === "tent") {
    return (
      <g>
        {shadow}
        <path d={`M${x} ${y - 58} L${x + 38} ${y} L${x - 38} ${y} z`} fill="#f2a6bd" />
        <path d={`M${x} ${y - 58} L${x + 38} ${y} L${x + 6} ${y} z`} fill="#e58ba6" />
        <path d={`M${x - 11} ${y} q11 -28 22 0z`} fill="#5a3a2a" />
        <path d={`M${x} ${y - 58} v-12 l12 6z`} fill="#f7d154" />
      </g>
    );
  }
  if (id === "kasteel") {
    return (
      <g>
        {shadowDefs}
        <ellipse cx={x} cy={y + 3} rx={62} ry={15} fill="url(#houseShadow)" />

        <rect x={x - 44} y={y - 8} width={88} height={12} rx={6} fill="#c2b6a3" />
        <rect x={x - 40} y={y - 56} width={80} height={56} rx={4} fill="#d8cbb8" />

        <rect x={x - 46} y={y - 76} width={18} height={76} fill="#c9bba6" />
        <rect x={x + 28} y={y - 76} width={18} height={76} fill="#c9bba6" />
        <path d={`M${x - 46} ${y - 76} l9 -14 l9 14z`} fill="#a8543f" />
        <path d={`M${x + 28} ${y - 76} l9 -14 l9 14z`} fill="#a8543f" />
        {[0, 1, 2, 3].map((i) => <rect key={i} x={x - 36 + i * 20} y={y - 66} width={10} height={12} fill="#d8cbb8" />)}
        <path d={`M${x - 14} ${y} v-22 a14 14 0 0 1 28 0 v22z`} fill="#8a5a3c" />
        <rect x={x - 2} y={y - 100} width={3} height={22} fill="#8a5a3c" />
        <path d={`M${x + 1} ${y - 100} h18 l-18 9z`} fill="#ef7fa6" />
      </g>
    );
  }
  // standaard: huisje
  return (
    <g>
      {shadowDefs}
      <ellipse cx={x} cy={y + 3} rx={56} ry={14} fill="url(#houseShadow)" />

      <rect x={x - 34} y={y - 8} width={68} height={11} rx={5} fill="#d8c3a2" />
      <rect x={x + 14} y={y - 90} width={9} height={22} fill="#8a5a3c" />
      <rect x={x - 30} y={y - 44} width={60} height={44} rx={4} fill="#e9d3b4" />

      <path d={`M${x - 38} ${y - 44} L${x} ${y - 76} L${x + 38} ${y - 44} z`} fill="#a8543f" />
      <rect x={x - 9} y={y - 26} width={18} height={26} rx={3} fill="#8a5a3c" />
      <rect x={x + 12} y={y - 36} width={14} height={12} rx={2} fill="#bfe3f5" stroke="#8a5a3c" strokeWidth="2" />
      <circle cx={x - 22} cy={y - 34} r="5" fill="#f2a6bd" />
    </g>
  );
}

const SCENES: Record<string, () => ReactElement> = {
  kamer: Kamer,
  tuin: Tuin,
  strand: Strand,
  snoep: Snoep,
  sterren: Sterren,
  sneeuw: Sneeuw,
};

export function PetScene({ id, house }: { id: string; house?: string }) {
  const Scene = SCENES[id] ?? Tuin;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full">
      <Scene />
      {house && house !== "geen" && <House id={house} />}
    </svg>
  );
}

