import { describe, expect, it } from "vitest";
import { celebrate, particlePlan } from "./celebrate";

describe("celebrate", () => {
  it("sends particles upwards, more for a big moment", () => {
    const small = particlePlan("klein", () => 0.5);
    const big = particlePlan("groot", () => 0.5);
    expect(big.length).toBeGreaterThan(small.length);
    for (const p of [...small, ...big]) expect(p.angle).toBe(-90);
  });
  it("cleans up after itself", async () => {
    celebrate("klein");
    expect(document.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
    await new Promise((r) => setTimeout(r, 1500));
    expect(document.body.children.length).toBe(0);
  });
});
