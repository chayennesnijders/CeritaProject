import { describe, expect, it } from "vitest";
import { visibleResponses, warningKey, warningVisible } from "./notice-seen";

const now = Date.parse("2026-11-07T12:00:00Z");
const day = 86_400_000;

describe("notices on the home screen", () => {
  it("hides answers you saw and answers older than two weeks", () => {
    const rows = [
      { id: "a", responded_at: new Date(now - day).toISOString() },
      { id: "b", responded_at: new Date(now - 2 * day).toISOString() },
      { id: "c", responded_at: new Date(now - 20 * day).toISOString() },
      { id: "d", responded_at: null },
    ];
    expect(visibleResponses(rows, new Set(["b"]), now).map((r) => r.id)).toEqual(["a"]);
  });
  it("hides a warning once you saw it, and shows a newer one again", () => {
    const w = { created_at: "2026-11-01T10:00:00Z" };
    expect(warningVisible(w, new Set())).toBe(true);
    expect(warningVisible(w, new Set([warningKey(w.created_at)]))).toBe(false);
    expect(warningVisible({ created_at: "2026-11-05T10:00:00Z" }, new Set([warningKey(w.created_at)]))).toBe(true);
    expect(warningVisible(null, new Set())).toBe(false);
  });
});
