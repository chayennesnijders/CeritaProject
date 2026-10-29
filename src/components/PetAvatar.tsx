type Look = { body: string; belly: string; ear: string };
const LOOKS: Record<string, Look> = {
  kat: { body: "#E8A87C", belly: "#FBE3D0", ear: "#F4B6C2" },
  hond: { body: "#A9744F", belly: "#F1DCC4", ear: "#6B4226" },
  konijn: { body: "#F3EDE7", belly: "#FFFFFF", ear: "#F4B6C2" },
  draak: { body: "#8CCB9B", belly: "#E6F5DA", ear: "#5E9E6E" },
  beer: { body: "#8B5E3C", belly: "#D9B48F", ear: "#5C3A21" },
  panda: { body: "#FAFAFA", belly: "#FFFFFF", ear: "#2B2B2B" },
};

function Ears({ species, l }: { species: string; l: Look }) {
  switch (species) {
    case "kat":
      return (<><path d="M48 62 L58 18 L84 50 Z" fill={l.body} /><path d="M56 52 L60 30 L74 48 Z" fill={l.ear} />
        <path d="M152 62 L142 18 L116 50 Z" fill={l.body} /><path d="M144 52 L140 30 L126 48 Z" fill={l.ear} /></>);
    case "hond":
      return (<><ellipse cx="44" cy="82" rx="16" ry="34" fill={l.ear} transform="rotate(18 44 82)" />
        <ellipse cx="156" cy="82" rx="16" ry="34" fill={l.ear} transform="rotate(-18 156 82)" /></>);
    case "konijn":
      // Ears start at y≈6 so they fit inside the 200×200 drawing (they used to stick out above it and got cut off).
      return (<><ellipse cx="76" cy="42" rx="13" ry="36" fill={l.body} /><ellipse cx="76" cy="44" rx="6" ry="26" fill={l.ear} />
        <ellipse cx="124" cy="42" rx="13" ry="36" fill={l.body} /><ellipse cx="124" cy="44" rx="6" ry="26" fill={l.ear} /></>);
    case "draak":
      return (<><path d="M70 50 L78 20 L90 46 Z" fill={l.ear} /><path d="M130 50 L122 20 L110 46 Z" fill={l.ear} />
        <path d="M94 40 L100 22 L106 40 Z" fill={l.ear} /></>);
    default:
      return (<><circle cx="58" cy="52" r="20" fill={l.ear} /><circle cx="142" cy="52" r="20" fill={l.ear} /></>);
  }
}

// Groeistadia: het diertje wordt per level groter en krijgt meer details.
// baby (1-2) → kind (3-4) → tiener (5-6) → volwassen (7+)
export function growthStage(level: number): 1 | 2 | 3 | 4 {
  if (level >= 7) return 4;
  if (level >= 5) return 3;
  if (level >= 3) return 2;
  return 1;
}
export const STAGE_LABELS = ["", "Baby", "Kind", "Tiener", "Volwassen"] as const;

export function PetAvatar({ species, mood, jumping, onTap, outfit = "geen", level = 1 }: {
  outfit?: string; species: string; mood: "slaap" | "blij" | "super"; jumping: boolean; onTap: () => void; level?: number;
}) {
  const l: Look = LOOKS[species] ?? LOOKS["kat"]!;
  const sleeping = mood === "slaap";
  const eyeY = 96;
  const stage = growthStage(level);
  const scale = [0, 0.82, 0.92, 1, 1.08][stage]!;
  // Baby's hebben grotere ogen; volwassen dieren kleinere.
  const eyeRx = stage === 1 ? 11 : stage === 2 ? 10 : 9;
  const eyeRy = stage === 1 ? 15 : stage === 2 ? 13 : 12;
  return (
    <button type="button" onClick={onTap} aria-label="Aai je diertje" className="relative mx-auto block h-56 w-56">
      <div className={jumping ? "pet-jump" : sleeping ? "pet-sleep" : "pet-bob"}>
        <svg viewBox="0 0 200 200" overflow="visible" className="h-56 w-56 drop-shadow-lg" style={{ transform: `scale(${scale})`, transformOrigin: "50% 100%" }}>
          <ellipse cx="100" cy="190" rx="56" ry="7" fill="#000" opacity=".12" />
          <Ears species={species} l={l} />
          {species === "draak" && <path d="M160 160 Q190 150 186 120 Q178 140 156 146 Z" fill={l.body} />}
          <path d="M100 40 C150 40 172 90 170 135 C168 178 140 188 100 188 C60 188 32 178 30 135 C28 90 50 40 100 40 Z" fill={l.body} />
          <ellipse cx="100" cy="148" rx="44" ry="34" fill={l.belly} />
          {species === "panda" && (<><ellipse cx="76" cy={eyeY} rx="15" ry="18" fill="#2B2B2B" /><ellipse cx="124" cy={eyeY} rx="15" ry="18" fill="#2B2B2B" /></>)}
          {sleeping ? (
            <><path d={`M66 ${eyeY} q10 8 20 0`} stroke="#2B1A12" strokeWidth="4" fill="none" strokeLinecap="round" />
              <path d={`M114 ${eyeY} q10 8 20 0`} stroke="#2B1A12" strokeWidth="4" fill="none" strokeLinecap="round" /></>
          ) : (
            <g className="pet-blink">
              <ellipse cx="76" cy={eyeY} rx={eyeRx} ry={eyeRy} fill={species === "panda" ? "#fff" : "#2B1A12"} />
              <ellipse cx="124" cy={eyeY} rx={eyeRx} ry={eyeRy} fill={species === "panda" ? "#fff" : "#2B1A12"} />
              <circle cx="79" cy={eyeY - 4} r="3.5" fill={species === "panda" ? "#2B1A12" : "#fff"} />
              <circle cx="127" cy={eyeY - 4} r="3.5" fill={species === "panda" ? "#2B1A12" : "#fff"} />
            </g>
          )}
          {/* Vanaf kind-stadium: pootjes onderaan */}
          {stage >= 2 && (<>
            <ellipse cx="72" cy="184" rx="16" ry="8" fill={l.ear} />
            <ellipse cx="128" cy="184" rx="16" ry="8" fill={l.ear} />
          </>)}
          {/* Vanaf tiener-stadium: staart en snorharen */}
          {stage >= 3 && species === "kat" && (<>
            <path d="M34 150 Q6 140 12 108" stroke={l.body} strokeWidth="12" fill="none" strokeLinecap="round" />
            <path d="M52 108 L26 102 M52 116 L24 118 M148 108 L174 102 M148 116 L176 118" stroke="#2B1A12" strokeWidth="2.5" strokeLinecap="round" />
          </>)}
          {stage >= 3 && species === "hond" && (
            <path d="M166 150 Q192 138 184 112" stroke={l.body} strokeWidth="12" fill="none" strokeLinecap="round" />
          )}
          {stage >= 3 && species === "konijn" && (
            <circle cx="32" cy="150" r="12" fill="#fff" />
          )}
          {/* Volwassen draak: vleugels */}
          {stage >= 4 && species === "draak" && (<>
            <path d="M36 120 Q-4 96 10 56 Q34 84 52 96 Z" fill={l.ear} opacity=".9" />
            <path d="M164 120 Q204 96 190 56 Q166 84 148 96 Z" fill={l.ear} opacity=".9" />
          </>)}
          <ellipse cx="60" cy="118" rx="10" ry="6" fill="#F49AB0" opacity=".6" />
          <ellipse cx="140" cy="118" rx="10" ry="6" fill="#F49AB0" opacity=".6" />
          {(species === "hond" || species === "beer" || species === "panda") && <ellipse cx="100" cy="112" rx="8" ry="6" fill="#2B1A12" />}
          {species === "kat" && <path d="M95 110 L105 110 L100 116 Z" fill="#E36F8C" />}
          {sleeping ? (
            <circle cx="100" cy="126" r="4" fill="#2B1A12" />
          ) : mood === "super" ? (
            <path d="M84 120 Q100 142 116 120 Z" fill="#7A2E3B" />
          ) : (
            <path d="M88 122 Q100 132 112 122" stroke="#2B1A12" strokeWidth="4" fill="none" strokeLinecap="round" />
          )}
          {outfit === "strik" && (<g transform="translate(130 46) rotate(15)"><path d="M0 0 L-18 -10 L-18 10 Z M0 0 L18 -10 L18 10 Z" fill="#E36F8C" /><circle r="5" fill="#C24E6E" /></g>)}
          {outfit === "pet" && (<g><path d="M58 64 Q100 20 142 64 Z" fill="#3B6FD8" /><path d="M120 62 Q160 60 168 72 L124 68 Z" fill="#2A54A8" /><circle cx="100" cy="36" r="4" fill="#2A54A8" /></g>)}
          {outfit === "bril" && (<g><rect x="60" y="84" width="34" height="24" rx="10" fill="#1d1d1d" opacity=".92" /><rect x="106" y="84" width="34" height="24" rx="10" fill="#1d1d1d" opacity=".92" /><path d="M94 94 L106 94" stroke="#1d1d1d" strokeWidth="4" /></g>)}
          {outfit === "sjaal" && (<g><path d="M44 134 Q100 156 156 134 L158 148 Q100 172 42 148 Z" fill="#D94A4A" /><path d="M120 150 L128 182 L142 178 L134 146 Z" fill="#B83A3A" /></g>)}
          {outfit === "kroon" && (<path d="M72 50 L76 22 L90 38 L100 16 L110 38 L124 22 L128 50 Z" fill="#F2C744" stroke="#D9A920" strokeWidth="2" />)}
        </svg>
      </div>
      {sleeping && <span className="pet-float absolute right-6 top-4 text-2xl" style={{ animationIterationCount: "infinite", animationDuration: "2.5s" }}>💤</span>}
    </button>
  );
}
