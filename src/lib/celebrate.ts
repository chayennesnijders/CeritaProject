/**
 * Small moments of joy: a burst of emojis that floats up and fades, plus a short buzz. Used when a
 * member does something kind or finishes something (a letter, a compliment, a level, a won game).
 * Respects "reduce motion": then only the buzz.
 */
export type CelebrateKind = "klein" | "groot";

const SETS: Record<string, string[]> = {
  hartjes: ["💗", "🤍", "💕", "✨"],
  feest: ["🎉", "✨", "💗", "⭐", "🎊"],
  natuur: ["🌱", "🌸", "✨", "🍃"],
  sterren: ["⭐", "✨", "🌟", "💫"],
};

/** Where each particle goes (pure, so it can be tested): angle in degrees, distance and delay. */
export function particlePlan(kind: CelebrateKind, seed = Math.random) {
  const n = kind === "groot" ? 26 : 12;
  return Array.from({ length: n }, (_, i) => ({
    angle: -90 + (seed() - 0.5) * (kind === "groot" ? 160 : 110),
    distance: (kind === "groot" ? 160 : 100) + seed() * (kind === "groot" ? 160 : 90),
    delay: Math.round(seed() * (kind === "groot" ? 220 : 120)),
    size: 18 + Math.round(seed() * (kind === "groot" ? 18 : 10)),
    index: i,
  }));
}

export function celebrate(
  kind: CelebrateKind = "klein",
  opts: { set?: keyof typeof SETS; from?: { x: number; y: number } } = {},
) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  try {
    navigator.vibrate?.(kind === "groot" ? [20, 40, 30] : 15);
  } catch {
    /* no vibration */
  }
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const emojis = SETS[opts.set ?? (kind === "groot" ? "feest" : "hartjes")]!;
  const x = opts.from?.x ?? window.innerWidth / 2;
  const y = opts.from?.y ?? window.innerHeight * 0.55;
  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden";
  document.body.appendChild(layer);
  for (const p of particlePlan(kind)) {
    const el = document.createElement("span");
    el.textContent = emojis[p.index % emojis.length]!;
    el.style.cssText = `position:absolute;left:${x}px;top:${y}px;font-size:${p.size}px;line-height:1;will-change:transform,opacity`;
    layer.appendChild(el);
    const rad = (p.angle * Math.PI) / 180;
    const dx = Math.cos(rad) * p.distance;
    const dy = Math.sin(rad) * p.distance;
    el.animate?.(
      [
        { transform: "translate(-50%,-50%) scale(.4)", opacity: 0 },
        {
          transform: `translate(calc(-50% + ${dx * 0.6}px), calc(-50% + ${dy * 0.6}px)) scale(1.1)`,
          opacity: 1,
          offset: 0.35,
        },
        {
          transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 60}px)) scale(.9)`,
          opacity: 0,
        },
      ],
      {
        duration: kind === "groot" ? 1400 : 1000,
        delay: p.delay,
        easing: "cubic-bezier(.2,.7,.3,1)",
        fill: "forwards",
      },
    );
  }
  setTimeout(() => layer.remove(), kind === "groot" ? 1900 : 1400);
}
