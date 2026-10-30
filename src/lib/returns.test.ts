import { describe, expect, it } from "vitest";
import { canReturn, returnAddressMail, returnStatus, stripeEnvironmentFor } from "./returns";

describe("returns", () => {
  const now = new Date("2026-10-30T12:00:00Z");
  it("allows a return of a paid order within 30 days, once", () => {
    expect(canReturn({ kind: "paid", created_at: "2026-10-10T12:00:00Z" }, false, now)).toBe(true);
    expect(canReturn({ kind: "paid", created_at: "2026-09-01T12:00:00Z" }, false, now)).toBe(false);
    expect(canReturn({ kind: "paid", created_at: "2026-10-10T12:00:00Z" }, true, now)).toBe(false);
    expect(canReturn({ kind: "free", created_at: "2026-10-10T12:00:00Z" }, false, now)).toBe(false);
  });

  it("refunds test payments in test mode", () => {
    expect(stripeEnvironmentFor("cs_test_123")).toBe("sandbox");
    expect(stripeEnvironmentFor("cs_live_123")).toBe("live");
  });

  it("has texts for every status and a ready e-mail", () => {
    expect(returnStatus("terugbetaald").label).toBe("Terugbetaald");
    expect(returnStatus("raar").label).toBe("Aangevraagd");
    const m = returnAddressMail("Fidget beer", "Sanne");
    expect(m.subject).toContain("Fidget beer");
    expect(m.body).toContain("Hoi Sanne");
  });
});
