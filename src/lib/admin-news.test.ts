import { describe, expect, it } from "vitest";
import { dayLabel, isNew, newsCounts, newsKind, unreadNews, type NewsItem } from "./admin-news";

const item = (kind: string, created_at: string): NewsItem => ({
  kind,
  ref_id: kind + created_at,
  title: "t",
  detail: "",
  created_at,
});
const items = [
  item("aanmelding", "2026-10-29T10:00:00Z"),
  item("melding", "2026-10-29T09:00:00Z"),
  item("verhaal", "2026-10-28T12:00:00Z"),
  item("bestelling", "2026-10-20T12:00:00Z"),
];

describe("admin news", () => {
  it("marks items after the last visit as new", () => {
    expect(isNew(items[0]!, "2026-10-29T08:00:00Z")).toBe(true);
    expect(isNew(items[2]!, "2026-10-29T08:00:00Z")).toBe(false);
    expect(isNew(items[3]!, null)).toBe(true);
  });

  it("does not count reports twice in the badge", () => {
    expect(unreadNews(items, "2026-10-28T00:00:00Z")).toBe(2);
    expect(unreadNews(items, null)).toBe(3);
  });

  it("counts per kind since a moment", () => {
    expect(newsCounts(items, "2026-10-22T00:00:00Z")).toEqual({
      aanmelding: 1,
      melding: 1,
      verhaal: 1,
    });
  });

  it("knows every kind and has a fallback", () => {
    expect(newsKind("verhaal").tab).toBe("verhalen");
    expect(newsKind("iets").emoji).toBe("📣");
  });

  it("labels days in Dutch time", () => {
    const now = new Date("2026-10-29T12:00:00Z");
    expect(dayLabel("2026-10-29T08:00:00Z", now)).toBe("Vandaag");
    expect(dayLabel("2026-10-28T23:30:00Z", now)).toBe("Vandaag"); // already the 29th in the Netherlands
    expect(dayLabel("2026-10-28T08:00:00Z", now)).toBe("Gisteren");
    expect(dayLabel("2026-10-20T08:00:00Z", now)).toBe("dinsdag 20 oktober");
  });
});
