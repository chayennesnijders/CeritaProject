import { describe, expect, it } from "vitest";
import { GUIDES, guideBySlug, guidePercent } from "./guides";

describe("guides", () => {
  it("have unique slugs and steps that make sense", () => {
    expect(new Set(GUIDES.map((g) => g.slug)).size).toBe(GUIDES.length);
    for (const g of GUIDES) {
      expect(g.steps.length).toBeGreaterThan(3);
      expect(g.cheatsheet.length).toBeGreaterThan(0);
      for (const s of g.steps) {
        if (s.kind === "keuze") {
          expect(s.options.some((o) => o.verdict === "goed")).toBe(true);
          expect(s.options.length).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });
  it("always point to help when they talk about not wanting to live", () => {
    const g = guideBySlug("gesprek-beginnen")!;
    const text = JSON.stringify(g);
    expect(text).toContain("0800-0113");
    expect(text).toContain("112");
  });
  it("count progress", () => {
    const g = GUIDES[0]!;
    expect(guidePercent(g, 0, false)).toBe(0);
    expect(guidePercent(g, g.steps.length, false)).toBe(100);
    expect(guidePercent(g, 2, true)).toBe(100);
    expect(guideBySlug("bestaat-niet")).toBeNull();
  });
});
