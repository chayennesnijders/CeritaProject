import { describe, expect, it } from "vitest";
import { ambSourceFrom, storedSource } from "./referral";

describe("referral", () => {
  it("only picks up ambassador sources", () => {
    expect(ambSourceFrom("?bron=amb-noor")).toBe("amb-noor");
    expect(ambSourceFrom("?bron=AMB-Noor2")).toBe("amb-noor2");
    expect(ambSourceFrom("?bron=vriend")).toBeNull();
    expect(ambSourceFrom("?bron=amb-<x>")).toBeNull();
    expect(ambSourceFrom("")).toBeNull();
  });

  it("keeps a source for 30 days", () => {
    const now = Date.UTC(2026, 10, 17);
    const raw = (daysAgo: number) => JSON.stringify({ source: "amb-noor", at: now - daysAgo * 86_400_000 });
    expect(storedSource(raw(3), now)).toBe("amb-noor");
    expect(storedSource(raw(31), now)).toBeNull();
    expect(storedSource("nonsense", now)).toBeNull();
    expect(storedSource(null, now)).toBeNull();
  });
});
