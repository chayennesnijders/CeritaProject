import { describe, expect, it } from "vitest";
import { badgeLabel, sumCounts, incomingRequestCount } from "./unread";

describe("meldingtellers", () => {
  it("telt geen verzoeken tussen andere leden in de beheerdersinbox", () => {
    expect(incomingRequestCount(Array.from({ length: 5 }, () => ({ user_a: "xai", user_b: "noekie", requested_by: "xai" })), "chayenne")).toBe(0);
    expect(incomingRequestCount([{ user_a: "xai", user_b: "chayenne", requested_by: "xai" }, { user_a: "chayenne", user_b: "anouk", requested_by: "chayenne" }], "chayenne")).toBe(1);
  });
  it("telt alle ongelezen gesprekken bij elkaar op", () => {
    expect(sumCounts({})).toBe(0);
    expect(sumCounts({ a: 1, b: 4, c: 0 })).toBe(5);
  });

  it("kort grote aantallen af op het badge-plantje", () => {
    expect(badgeLabel(0)).toBe("");
    expect(badgeLabel(1)).toBe("1");
    expect(badgeLabel(99)).toBe("99");
    expect(badgeLabel(150)).toBe("99+");
  });
});
