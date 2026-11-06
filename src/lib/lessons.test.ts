import { describe, expect, it } from "vitest";
import { dutchToday, licenseWorks, makeCode, mayDownload, normalizeCode, schoolYearEnd } from "./lessons";

describe("school codes", () => {
  it("accepts the code however it is typed", () => {
    expect(normalizeCode("kx7p 2m9q")).toBe("KX7P-2M9Q");
    expect(normalizeCode("KX7P-2M9Q")).toBe("KX7P-2M9Q");
    expect(normalizeCode(" kx7p2m9q ")).toBe("KX7P-2M9Q");
    expect(normalizeCode("KX7P")).toBeNull();
    expect(normalizeCode("")).toBeNull();
  });
  it("makes readable codes in the right shape", () => {
    const code = makeCode(new Uint8Array([0, 1, 2, 3, 250, 251, 252, 253]));
    expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(code).not.toMatch(/[01OIL]/);
  });
});

describe("licences", () => {
  const today = "2026-11-06";
  it("work until and including their last day, while switched on", () => {
    expect(licenseWorks({ active: true, valid_until: "2027-07-31" }, today)).toBe(true);
    expect(licenseWorks({ active: true, valid_until: today }, today)).toBe(true);
    expect(licenseWorks({ active: true, valid_until: "2026-11-05" }, today)).toBe(false);
    expect(licenseWorks({ active: false, valid_until: "2027-07-31" }, today)).toBe(false);
    expect(licenseWorks(null, today)).toBe(false);
  });
  it("let free lessons through without a code, others only with one", () => {
    expect(mayDownload({ is_free: true, published: true }, false)).toBe(true);
    expect(mayDownload({ is_free: false, published: true }, false)).toBe(false);
    expect(mayDownload({ is_free: false, published: true }, true)).toBe(true);
    expect(mayDownload({ is_free: true, published: false }, true)).toBe(false);
  });
  it("end at the end of the school year", () => {
    expect(schoolYearEnd("2026-11-06")).toBe("2027-07-31");
    expect(schoolYearEnd("2027-03-01")).toBe("2027-07-31");
    expect(schoolYearEnd("2027-08-15")).toBe("2028-07-31");
  });
  it("use the Dutch date", () => {
    expect(dutchToday(new Date("2026-11-06T23:30:00Z"))).toBe("2026-11-07");
  });
});
