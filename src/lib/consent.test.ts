import { describe, expect, it } from "vitest";
import { ageOn, consentNeeded } from "./consent";

describe("consent", () => {
  it("knows exact ages", () => {
    expect(ageOn("2010-10-30", "2026-10-29")).toBe(15);
    expect(ageOn("2010-10-30", "2026-10-30")).toBe(16);
    expect(ageOn("", "2026-10-30")).toBeNull();
  });

  it("asks new members and members after a change", () => {
    expect(consentNeeded(null, "v2", 20)).toEqual({ terms: true, parent: false });
    expect(consentNeeded({ terms_version: "v1", parent_confirmed_at: null }, "v2", 20)).toEqual({
      terms: true,
      parent: false,
    });
    expect(consentNeeded({ terms_version: "v2", parent_confirmed_at: null }, "v2", 20)).toBeNull();
  });

  it("asks under 16 about a parent once", () => {
    expect(consentNeeded({ terms_version: "v2", parent_confirmed_at: null }, "v2", 14)).toEqual({
      terms: false,
      parent: true,
    });
    expect(
      consentNeeded({ terms_version: "v2", parent_confirmed_at: "2026-01-01" }, "v2", 14),
    ).toBeNull();
    expect(
      consentNeeded({ terms_version: "v1", parent_confirmed_at: "2026-01-01" }, "v2", 14),
    ).toEqual({ terms: true, parent: false });
  });
});
