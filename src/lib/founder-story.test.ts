import { describe, expect, it } from "vitest";
import { FOUNDER_STORY_COUNT, founderStory, nextMilestone } from "./founder-story";

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

describe("goals", () => {
  it("names the next round number to grow towards", () => {
    expect(nextMilestone(84)).toBe(100);
    expect(nextMilestone(100)).toBe(250);
    expect(nextMilestone(120000)).toBe(200000);
  });

  it("mentions money goals every other day", () => {
    const all = Array.from({ length: FOUNDER_STORY_COUNT }, (_, i) =>
      founderStory(stats, new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10)),
    );
    expect(all.filter((s) => s.dream.includes("€")).length).toBeGreaterThanOrEqual(9);
    expect(all.some((s) => s.dream.includes("€1.000.000"))).toBe(true);
    expect(all.some((s) => s.title.startsWith("Op weg naar 250"))).toBe(true);
  });
});
