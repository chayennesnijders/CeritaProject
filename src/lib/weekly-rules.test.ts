import { describe, expect, it } from "vitest";
import { rulesDue, tipForWeek } from "./weekly-rules";

describe("weekly rules reminder", () => {
  it("shows once per week", () => {
    expect(rulesDue(null, "2026-11-02")).toBe(true);
    expect(rulesDue("2026-11-02", "2026-11-02")).toBe(false);
    expect(rulesDue("2026-11-02", "2026-11-09")).toBe(true);
  });
  it("has a different tip next week", () => {
    expect(tipForWeek("2026-11-09")).not.toBe(tipForWeek("2026-11-02"));
  });
});
