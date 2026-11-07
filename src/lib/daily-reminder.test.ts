import { describe, expect, it } from "vitest";
import { reminderPush, shouldRemind } from "./daily-reminder";

const base = { enabled: true, hour: 19, remindedOn: null, today: "2026-11-07", hourNow: 19, didSomethingToday: false };

describe("daily pet reminder", () => {
  it("reminds once, at the chosen hour, only when nothing was done yet", () => {
    expect(shouldRemind(base)).toBe(true);
    expect(shouldRemind({ ...base, enabled: false })).toBe(false);
    expect(shouldRemind({ ...base, hourNow: 18 })).toBe(false);
    expect(shouldRemind({ ...base, remindedOn: "2026-11-07" })).toBe(false);
    expect(shouldRemind({ ...base, remindedOn: "2026-11-06" })).toBe(true);
    expect(shouldRemind({ ...base, didSomethingToday: true })).toBe(false);
    expect(shouldRemind({ ...base, hour: null })).toBe(true);
  });
  it("mentions the streak when there is one", () => {
    expect(reminderPush(5).body).toContain("5 dagen");
    expect(reminderPush(0).body).not.toContain("reeks");
    expect(reminderPush(3).link).toBe("/diertje");
  });
});
