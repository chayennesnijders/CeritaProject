import { describe, expect, it } from "vitest";
import { lastSeen, testItems, testPath, testPhases, testProgress, testQuestions } from "./test-checklist";
import { TEST_ITEM_COUNT } from "./test-week";

describe("tester checklist", () => {
  it("has unique, stable ids per role", () => {
    for (const role of ["ouder", "jongere"] as const) {
      const ids = testItems(role).map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(testQuestions(role)).toHaveLength(4);
    }
  });
  it("counts progress per phase and ignores unknown ids", () => {
    const first = testPhases("jongere")[0]!.items.map((i) => i.id);
    const p = testProgress("jongere", { [first[0]!]: true, [first[1]!]: true, "o-s1": true, oud: true });
    expect(p.phases[0]!.id).toBe("j0");
    expect(p.done).toBe(2);
    expect(p.phases[0]).toMatchObject({ done: 2, total: first.length });
    expect(p.pct).toBe(Math.round((2 / p.total) * 100));
    expect(testProgress("ouder", {}).pct).toBe(0);
  });
  it("uses the existing test week for young people", () => {
    expect(testItems("jongere")).toHaveLength(TEST_ITEM_COUNT);
    expect(testPath("jongere")).toBe("/testen");
    expect(testPath("ouder")).toBe("/testlijst");
    expect(testItems("ouder").every((i) => i.id.startsWith("o-"))).toBe(true);
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
