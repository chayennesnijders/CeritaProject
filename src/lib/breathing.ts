/** A calm breathing rhythm: 4 seconds in, 2 hold, 6 out (longer out-breath helps you relax). */
export const BREATH_PHASES = [
  { id: "in", label: "Adem in", seconds: 4, scale: [0.6, 1] },
  { id: "vast", label: "Even vasthouden", seconds: 2, scale: [1, 1] },
  { id: "uit", label: "Adem rustig uit", seconds: 6, scale: [1, 0.6] },
] as const;
export const BREATH_CYCLE = BREATH_PHASES.reduce((a, p) => a + p.seconds, 0);

/** Where you are after `t` seconds: the phase, seconds left in it, how big Riti is and which round. */
export function breathAt(t: number) {
  const round = Math.floor(t / BREATH_CYCLE) + 1;
  let rest = t % BREATH_CYCLE;
  for (const p of BREATH_PHASES) {
    if (rest < p.seconds) {
      const f = rest / p.seconds;
      const eased = 0.5 - Math.cos(Math.PI * f) / 2;
      return {
        phase: p,
        left: Math.ceil(p.seconds - rest),
        scale: p.scale[0] + (p.scale[1] - p.scale[0]) * eased,
        round,
      };
    }
    rest -= p.seconds;
  }
  return { phase: BREATH_PHASES[0], left: BREATH_PHASES[0].seconds, scale: 0.6, round };
}
