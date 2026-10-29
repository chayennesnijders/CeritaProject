import { describe, expect, it } from "vitest";
import { birthdayAge } from "./birthday";

describe("birthdayAge", () => {
  it("gives the new age on the birthday only", () => {
    expect(birthdayAge("2010-10-29", "2026-10-29")).toBe(16);
    expect(birthdayAge("2010-10-29", "2026-10-30")).toBeNull();
    expect(birthdayAge("2010-10-29", "2026-11-29")).toBeNull();
  });

  it("celebrates 29 February on 28 February in other years", () => {
    expect(birthdayAge("2012-02-29", "2027-02-28")).toBe(15);
    expect(birthdayAge("2012-02-29", "2028-02-28")).toBeNull();
    expect(birthdayAge("2012-02-29", "2028-02-29")).toBe(16);
  });

  it("ignores empty or odd dates", () => {
    expect(birthdayAge("", "2026-10-29")).toBeNull();
    expect(birthdayAge("2026-10-29", "2026-10-29")).toBeNull();
  });
});
