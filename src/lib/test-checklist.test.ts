import { describe, expect, it } from "vitest";
import { lastSeen, testItems, testPath, testPhases, testProgress, testQuestions } from "./test-checklist";
import { TEST_FORM } from "./test-week";

describe("tester checklist", () => {
  it("has unique, stable ids per role", () => {
    for (const role of ["ouder", "jongere"] as const) {
      const ids = testItems(role).map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(testQuestions(role).length).toBeGreaterThanOrEqual(4);
    }
  });
  it("counts ticked items for parents and ignores unknown ids", () => {
    const first = testPhases("ouder")[0]!.items.map((i) => i.id);
    const p = testProgress("ouder", { [first[0]!]: true, [first[1]!]: true, mail: true });
    expect(p.done).toBe(2);
    expect(p.phases[0]).toMatchObject({ id: "start", done: 2, total: first.length });
    expect(p.pct).toBe(Math.round((2 / p.total) * 100));
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
