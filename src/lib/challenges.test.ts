import { describe, expect, it } from "vitest";
import { challengeCycleDay, challengeDay } from "./challenges";

describe("challengeDay", () => {
  it("switches at 00:00 Dutch time, not UTC", () => {
    // 22:59 UTC = 23:59 in winter time, 23:00 UTC = 00:00 the next day
    expect(challengeDay(new Date("2026-01-14T22:59:00Z"))).toBe("2026-01-14");
    expect(challengeDay(new Date("2026-01-14T23:00:00Z"))).toBe("2026-01-15");
    // summer time: 22:00 UTC = 00:00
    expect(challengeDay(new Date("2026-07-14T21:59:00Z"))).toBe("2026-07-14");
    expect(challengeDay(new Date("2026-07-14T22:00:00Z"))).toBe("2026-07-15");
  });
});

describe("challengeCycleDay", () => {
  it("runs from 1 to 365 and then starts over", () => {
    expect(challengeCycleDay("2026-01-01")).toBe(1);
    expect(challengeCycleDay("2026-01-02")).toBe(2);
    expect(challengeCycleDay("2026-12-31")).toBe(365);
    expect(challengeCycleDay("2027-01-01")).toBe(1);
    expect(challengeCycleDay("2025-12-31")).toBe(365);
  });
});
