import { describe, expect, it } from "vitest";
import { sameFeelingText } from "./group-checkin";

describe("sameFeelingText", () => {
  it("tells you how many others feel the same (not counting you)", () => {
    expect(sameFeelingText("gestrest", [{ mood: "gestrest", total: 4 }])).toMatch(
      /3 anderen voelen zich deze week ook gestrest/,
    );
    expect(sameFeelingText("gestrest", [{ mood: "gestrest", total: 2 }])).toMatch(/1 ander voelt/);
  });
  it("just thanks you when you're the first", () => {
    expect(sameFeelingText("super", [{ mood: "super", total: 1 }])).toMatch(/Dank je/);
    expect(sameFeelingText("super", [])).toMatch(/Dank je/);
  });
});
