import { describe, expect, it } from "vitest";
import { shiftDay, streakDays } from "./streak";

describe("streakDays", () => {
  it("counts days in a row up to today", () => {
    expect(streakDays(new Set(["2026-10-27", "2026-10-28", "2026-10-29"]), "2026-10-29")).toBe(3);
  });

  it("keeps yesterday's streak while today is not done yet", () => {
    expect(streakDays(new Set(["2026-10-27", "2026-10-28"]), "2026-10-29")).toBe(2);
  });

  it("starts over after a missed day", () => {
    expect(streakDays(new Set(["2026-10-25", "2026-10-26", "2026-10-29"]), "2026-10-29")).toBe(1);
    expect(streakDays(new Set(["2026-10-26"]), "2026-10-29")).toBe(0);
  });

  it("crosses months", () => {
    expect(shiftDay("2026-11-01", -1)).toBe("2026-10-31");
    expect(streakDays(new Set(["2026-10-31", "2026-11-01"]), "2026-11-01")).toBe(2);
  });
});
