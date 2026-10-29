import { useState } from "react";
import { ritiImage, type RitiExpression } from "@/lib/riti";

/**
 * Riti, the CeritaProject mascot (drawings from her character sheet).
 * She floats gently, shows the emotion you give her, jumps when tapped and can rock to say hello.
 */
export function Riti({
  size = 160,
  expression = "neutraal",
  wave = false,
  className = "",
}: {
  size?: number;
  expression?: RitiExpression;
  wave?: boolean;
  className?: string;
}) {
  const [jump, setJump] = useState(0);
  const [hearts, setHearts] = useState<number[]>([]);
  const [happy, setHappy] = useState(false);

  function tap() {
    const id = Date.now();
    setJump(id);
    setHappy(true);
    setHearts((h) => [...h, id]);
    setTimeout(() => setHearts((h) => h.filter((x) => x !== id)), 1000);
    setTimeout(() => setHappy(false), 900);
  }
  const shown = happy && expression === "neutraal" ? "blij" : expression;

  return (
    <button
      type="button"
      onClick={tap}
      aria-label="Riti, het beertje van CeritaProject"
      className={`relative shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <span className="absolute inset-0 motion-safe:animate-[riti-float_3.2s_ease-in-out_infinite]">
        <span
          className={`block h-full w-full ${wave ? "motion-safe:animate-[riti-rock_2.4s_ease-in-out_infinite]" : ""}`}
        >
          <img
            key={`${shown}-${jump}`}
            src={ritiImage(shown)}
            alt=""
            draggable={false}
            className={`h-full w-full object-contain drop-shadow-[0_8px_10px_rgba(120,60,60,0.18)] ${jump ? "motion-safe:animate-[riti-jump_0.6s_ease-out]" : "animate-in fade-in zoom-in-90 duration-300"}`}
          />
        </span>
      </span>
      {hearts.map((id) => (
        <span
          key={id}
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[15%] animate-[pet-float_1s_ease-out_forwards] text-2xl"
        >
          💕
        </span>
      ))}
    </button>
  );
}
