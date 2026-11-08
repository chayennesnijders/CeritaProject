import { describe, expect, it } from "vitest";
import { memberBand, memberBandChip } from "./member-band";

describe("memberBand", () => {
  it("shows parents as parents, never as an age band", () => {
    expect(memberBand({ is_parent: true, age_group: "senior", birthdate: null })).toBe("Ouder/verzorger");
    expect(memberBandChip({ is_parent: true, age_group: "senior" })).toContain("Ouder/verzorger");
  });
  it("says the age is unknown without a birthdate (the database default band is not real)", () => {
    expect(memberBand({ age_group: "senior", birthdate: null })).toBe("Leeftijd nog onbekend");
    expect(memberBandChip({ age_group: "senior" })).toContain("onbekend");
  });
  it("shows the band for young members with a birthdate", () => {
    expect(memberBand({ age_group: "junior", birthdate: "2011-05-01" })).toBe("13–15");
    expect(memberBandChip({ age_group: "senior", birthdate: "2005-05-01" })).toBe("👥 Groep 16–25");
  });
});
