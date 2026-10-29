import { describe, expect, it } from "vitest";
import {
  clock,
  formatDuration,
  isFresh,
  isLive,
  mediaKind,
  nextSpeed,
  resumeAt,
  toLocalInput,
} from "./media";

describe("media", () => {
  it("shows durations kindly", () => {
    expect(formatDuration(45)).toBe("45 sec");
    expect(formatDuration(12 * 60 + 10)).toBe("12 min");
    expect(formatDuration(65 * 60)).toBe("1 u 5 min");
    expect(formatDuration(120 * 60)).toBe("2 u");
    expect(formatDuration(null)).toBe("");
  });

  it("shows a player clock", () => {
    expect(clock(245)).toBe("4:05");
    expect(clock(3729)).toBe("1:02:09");
  });

  it("knows live, planned and new", () => {
    const now = new Date("2026-10-30T12:00:00Z");
    expect(isLive({ publish_at: "2026-10-30T11:00:00Z" }, now)).toBe(true);
    expect(isLive({ publish_at: "2026-10-31T11:00:00Z" }, now)).toBe(false);
    expect(isFresh({ publish_at: "2026-10-28T11:00:00Z" }, now)).toBe(true);
    expect(isFresh({ publish_at: "2026-10-01T11:00:00Z" }, now)).toBe(false);
    expect(isFresh({ publish_at: "2026-10-31T11:00:00Z" }, now)).toBe(false);
  });

  it("round-trips the date picker value", () => {
    const iso = new Date(2026, 10, 3, 19, 30).toISOString();
    expect(toLocalInput(iso)).toBe("2026-11-03T19:30");
    expect(new Date("2026-11-03T19:30").toISOString()).toBe(iso);
  });

  it("cycles speeds and resumes sensibly", () => {
    expect(nextSpeed(1)).toBe(1.25);
    expect(nextSpeed(2)).toBe(1);
    expect(resumeAt(120, 600)).toBe(120);
    expect(resumeAt(595, 600)).toBe(0);
    expect(resumeAt(3, 600)).toBe(0);
    expect(mediaKind("interview").emoji).toBe("🎤");
    expect(mediaKind("raar").label).toBe("Podcast");
  });
});
