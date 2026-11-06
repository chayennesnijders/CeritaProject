import { describe, expect, it } from "vitest";
import { dayNumber, PARENT_FOR_CHILD, PARENT_SELF, parentDay, parentMayOpen } from "./parent";
import { THEME_DAYS, themeDaysOn, themeTip } from "./theme-days";

describe("parent day", () => {
  it("gives the same assignment and tip all day, and a new one tomorrow", () => {
    const a = parentDay("2026-11-06");
    expect(parentDay("2026-11-06")).toEqual(a);
    expect(parentDay("2026-11-07").self).not.toBe(a.self);
    expect(PARENT_SELF).toContain(a.self);
    expect(PARENT_FOR_CHILD).toContain(a.child);
  });
  it("counts days from 1 January 2026, also before it", () => {
    expect(dayNumber("2026-01-01")).toBe(0);
    expect(dayNumber("2026-01-31")).toBe(30);
    expect(parentDay("2025-12-31").self).toBe(PARENT_SELF[PARENT_SELF.length - 1]);
  });
  it("only lets parents open their own pages", () => {
    expect(parentMayOpen("/home")).toBe(true);
    expect(parentMayOpen("/stemming")).toBe(true);
    expect(parentMayOpen("/community")).toBe(false);
    expect(parentMayOpen("/berichten/abc")).toBe(false);
    expect(parentMayOpen("/ceritabuddy")).toBe(false);
    expect(parentMayOpen("/homeless")).toBe(false);
  });
});

describe("theme days", () => {
  it("finds a day and periods that include it", () => {
    expect(themeDaysOn("2027-09-10").map((t) => t.title)).toEqual(["Wereld Suïcidepreventiedag"]);
    expect(themeDaysOn("2026-12-25").map((t) => t.title)).toEqual(["Kerst"]);
    expect(themeDaysOn("2026-12-05").map((t) => t.title)).toEqual(["Sinterklaas", "Orange the World"]);
    expect(themeDaysOn("2027-01-15")).toEqual([]);
  });
  it("has a tip for young people and parents on every day, and help lines on the heavy ones", () => {
    for (const t of THEME_DAYS) {
      expect(themeTip(t, "jongeren")).toBeTruthy();
      expect(themeTip(t, "ouders")).toBeTruthy();
      expect(t.to === undefined || t.to >= t.from).toBe(true);
    }
    expect(THEME_DAYS.find((t) => t.from === "2027-09-10")?.help).toContain("113");
  });
});
