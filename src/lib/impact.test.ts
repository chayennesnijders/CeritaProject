import { describe, expect, it } from "vitest";
import { impactSummary, showCount } from "./impact";

describe("impact", () => {
  it("hides small numbers", () => {
    expect(showCount(-1)).toBe("minder dan 5");
    expect(showCount(1234)).toBe("1.234");
    expect(showCount(undefined)).toBe("–");
  });

  it("writes a summary for partners without small numbers", () => {
    const text = impactSummary({
      cijfers: { leden: 120, actief_7d: 40, band_12_15: 30, band_16_25: 88, band_26_27: -1 },
      onderwerpen: [{ category: "in-je-hoofd", n: 200 }],
      gemaakt_op: "2026-10-30T10:00:00Z",
    });
    expect(text).toContain("Leden in totaal: 120");
    expect(text).toContain("26–27 jaar minder dan 5");
    expect(text).toContain("In je hoofd: 200");
    expect(text).toContain("30 oktober 2026");
  });
});
