import { describe, expect, it } from "vitest";
import { feedbackExport, lastSeen, testItems, testPath, testPhases, testProgress, testQuestions } from "./test-checklist";
import { PARENT_FORM, TEST_FORM } from "./test-week";

describe("tester checklist", () => {
  it("has unique, stable ids per role", () => {
    for (const role of ["ouder", "jongere"] as const) {
      const ids = testItems(role).map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(testQuestions(role).length).toBeGreaterThanOrEqual(4);
    }
  });
  it("gives parents only feedback questions, never about their child's details", () => {
    expect(testPhases("ouder")).toEqual([]);
    expect(testItems("ouder")).toEqual([]);
    const ids = PARENT_FORM.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(testQuestions("ouder").map((q) => q.id)).toEqual(ids);
    // Nothing that asks for a child's name, age, birthday or school.
    for (const q of PARENT_FORM) expect(q.label.toLowerCase()).not.toMatch(/naam|leeftijd|geboort|school/);
    // Old checklist ticks no longer count; answers do.
    const p = testProgress("ouder", { "o-s1": true }, { telefoon: "iPhone", leukst: "de tips", mis: " " });
    expect(p).toMatchObject({ done: 2, total: PARENT_FORM.length });
  });
  it("counts answered questions for young people", () => {
    expect(testItems("jongere")).toEqual([]);
    expect(testQuestions("jongere")).toHaveLength(TEST_FORM.length);
    const p = testProgress("jongere", { mail: true }, { telefoon: "iPhone", leukst: "groepen", mis: "  " });
    expect(p).toMatchObject({ done: 2, total: TEST_FORM.length });
    expect(testPath("jongere")).toBe("/testen");
    expect(testPath("ouder")).toBe("/testlijst");
  });
  it("says how long ago someone was busy", () => {
    const now = Date.parse("2026-11-07T12:00:00Z");
    expect(lastSeen("2026-11-07T11:59:30Z", now)).toBe("net");
    expect(lastSeen("2026-11-07T11:30:00Z", now)).toBe("30 min geleden");
    expect(lastSeen("2026-11-07T09:00:00Z", now)).toBe("3 uur geleden");
    expect(lastSeen("2026-11-06T10:00:00Z", now)).toBe("gisteren");
    expect(lastSeen("2026-11-04T12:00:00Z", now)).toBe("3 dagen geleden");
  });
});

describe("feedback export", () => {
  it("lists every tester by number with their answers, never names", () => {
    const text = feedbackExport(
      [
        { role: "jongere", checks: {}, notes: { telefoon: "iPhone", leukst: "de groepen", indruk: "gezellig", verstuurd: "ja" } },
        { role: "ouder", checks: { "o-s1": true }, notes: { wanneer: "’s Avonds", q2: "’s avonds" } },
      ],
      ["🧪 Testfeedback\nleukst: diertje"],
    );
    expect(text).toContain("2 testers, zonder namen");
    expect(text).toContain("Tester 1 (jongere)");
    expect(text).toContain("de groepen");
    expect(text).toContain("Tester 2 (ouder) · 1/");
    expect(text).toContain("’s Avonds");
    expect(text).toContain("(eerdere vraag “q2”)");
    expect(text).toContain("leukst: diertje");
    expect(text).toContain("(eerdere vraag “indruk”) gezellig");
    expect(text).toContain("✅ verstuurd");
  });
});
