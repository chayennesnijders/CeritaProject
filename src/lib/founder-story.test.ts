import { describe, expect, it } from "vitest";
import { FOUNDER_STORY_COUNT, founderStory } from "./founder-story";

const stats = { members: 40, waitlist: 84, stories: 157, groups: 6, coaches: 1 };

describe("founderStory", () => {
  it("changes every day and repeats after the whole list", () => {
    const a = founderStory(stats, "2026-11-02");
    const b = founderStory(stats, "2026-11-03");
    expect(a.title).not.toBe(b.title);
    const later = new Date(Date.UTC(2026, 10, 2 + FOUNDER_STORY_COUNT)).toISOString().slice(0, 10);
    expect(founderStory(stats, later).title).toBe(a.title);
  });

  it("uses the live numbers and never shows undefined", () => {
    const all = Array.from({ length: FOUNDER_STORY_COUNT }, (_, i) =>
      founderStory(stats, new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10)),
    );
    const text = all.map((s) => s.now + s.dream + s.step).join(" ");
    expect(text).toContain("84");
    expect(text).not.toContain("undefined");
    expect(text).not.toContain("NaN");
  });
});
