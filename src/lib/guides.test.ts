import { describe, expect, it } from "vitest";
import { CHECK_IN_AFTER_MS, cheatsheetText, GUIDES, guideBySlug, guidePercent, needsCheckIn, nextGuideFor, stepSpeech } from "./guides";

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
  it("the codeword guide promises no questions and still points to 112", () => {
    const g = guideBySlug("codewoord")!;
    const text = JSON.stringify(g);
    expect(text).toContain("112");
    expect(text).toContain("0800-0432");
    expect(text).toMatch(/geen vragen/i);
  });
  it("count progress", () => {
    const g = GUIDES[0]!;
    expect(guidePercent(g, 0, false)).toBe(0);
    expect(guidePercent(g, g.steps.length, false)).toBe(100);
    expect(guidePercent(g, 2, true)).toBe(100);
    expect(guideBySlug("bestaat-niet")).toBeNull();
  });
});

describe("guide extras", () => {
  it("every guide sells itself and has follow-up advice", () => {
    for (const g of GUIDES) {
      expect(g.outcomes.length).toBeGreaterThanOrEqual(3);
      expect(g.forWho).not.toBe("");
      expect(Object.keys(g.followUp).sort()).toEqual(["goed", "lastig", "niet"]);
      expect(g.steps.some((s) => s.kind === "gesprek")).toBe(true);
      expect(g.steps.some((s) => s.kind === "plan")).toBe(true);
      for (const s of g.steps) expect(stepSpeech(s).length).toBeGreaterThan(20);
    }
    expect(GUIDES.length).toBeGreaterThanOrEqual(5);
  });
  it("makes a shareable cheat sheet", () => {
    const g = GUIDES[0]!;
    const t = cheatsheetText(g, "Een wandeling plannen");
    expect(t).toContain(g.title);
    expect(t).toContain("1. ");
    expect(t).toContain("Mijn plan: Een wandeling plannen");
    expect(cheatsheetText(g, "  ")).not.toContain("Mijn plan");
  });
  it("asks how the plan went two days after finishing, once", () => {
    const done = "2026-11-01T10:00:00Z";
    const later = Date.parse(done) + CHECK_IN_AFTER_MS;
    expect(needsCheckIn({ completed_at: done, plan: "x", reflection: null }, later)).toBe(true);
    expect(needsCheckIn({ completed_at: done, plan: "x", reflection: null }, later - 1000)).toBe(false);
    expect(needsCheckIn({ completed_at: done, plan: "x", reflection: "goed" }, later)).toBe(false);
    expect(needsCheckIn({ completed_at: done, plan: "", reflection: null }, later)).toBe(false);
    expect(needsCheckIn({ completed_at: null, plan: "x", reflection: null }, later)).toBe(false);
  });
});

describe("next guide on the parent home", () => {
  it("continues a started guide first, then suggests a new one", () => {
    const [a, b] = GUIDES as [(typeof GUIDES)[0], (typeof GUIDES)[0]];
    expect(nextGuideFor([])).toMatchObject({ guide: { slug: a.slug }, status: "nieuw" });
    expect(nextGuideFor([{ guide: b.slug, step: 2, completed_at: null }])).toMatchObject({ guide: { slug: b.slug }, status: "verder" });
    expect(nextGuideFor([{ guide: a.slug, step: 9, completed_at: "x" }])!.guide.slug).toBe(b.slug);
    expect(nextGuideFor(GUIDES.map((g) => ({ guide: g.slug, step: 1, completed_at: "x" })))).toBeNull();
  });
});
