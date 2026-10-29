import { describe, expect, it } from "vitest";
import {
  categoryCounts,
  filterStories,
  kindForTab,
  ofKind,
  readingMinutes,
  relatedStories,
  sortStories,
  storiesByCategory,
  storyOfTheDay,
  type ReactionCounts,
} from "./discover";

const s = (id: string, category: string, created_at: string, title = id, body = "tekst") => ({
  id,
  title,
  body,
  category,
  created_at,
});
const stories = [
  s("a", "in-je-hoofd", "2026-07-01", "Angst op school", "Ik was bang"),
  s("b", "jong-zijn", "2026-07-03", "Pesten", "Ze lachten me uit"),
  s("c", "in-je-hoofd", "2026-07-02", "Somber", "Alles was grijs"),
  s("d", "relaties", "2026-07-04"),
];

describe("discover", () => {
  it("estimates reading time without counting photos", () => {
    expect(readingMinutes("kort")).toBe(1);
    expect(readingMinutes(`${"woord ".repeat(800)}\n\n[[foto:x.jpg]]`)).toBe(4);
  });

  it("picks one story of the day that changes daily", () => {
    const today = storyOfTheDay(stories, "2026-11-02");
    expect(storyOfTheDay(stories, "2026-11-02")).toBe(today);
    const week = new Set(
      ["01", "02", "03", "04"].map((d) => storyOfTheDay(stories, `2026-11-${d}`)!.id),
    );
    expect(week.size).toBe(4);
    expect(storyOfTheDay([], "2026-11-02")).toBeNull();
  });

  it("only lists categories that have stories", () => {
    expect(categoryCounts(stories)).toEqual([
      { category: "in-je-hoofd", count: 2 },
      { category: "jong-zijn", count: 1 },
      { category: "relaties", count: 1 },
    ]);
  });

  it("filters on search text, category, saved and unread", () => {
    const none = new Set<string>();
    const base = { query: "", category: null, onlySaved: false, onlyUnread: false };
    expect(
      filterStories(stories, { ...base, query: "LACHTEN" }, none, none).map((x) => x.id),
    ).toEqual(["b"]);
    expect(filterStories(stories, { ...base, query: "bang" }, none, none).map((x) => x.id)).toEqual(
      ["a"],
    );
    expect(
      filterStories(stories, { ...base, category: "in-je-hoofd" }, none, none).map((x) => x.id),
    ).toEqual(["a", "c"]);
    expect(
      filterStories(stories, { ...base, onlySaved: true }, new Set(["d"]), none).map((x) => x.id),
    ).toEqual(["d"]);
    expect(
      filterStories(stories, { ...base, onlyUnread: true }, none, new Set(["a", "b"])).map(
        (x) => x.id,
      ),
    ).toEqual(["c", "d"]);
  });

  it("sorts newest first or by reactions", () => {
    const counts = new Map<string, ReactionCounts>([
      ["a", { herkenbaar: 5, knuffel: 1, sterk: 0 }],
      ["c", { herkenbaar: 1, knuffel: 0, sterk: 0 }],
    ]);
    expect(sortStories(stories, "nieuw", counts).map((x) => x.id)).toEqual(["d", "b", "c", "a"]);
    expect(sortStories(stories, "herkend", counts).map((x) => x.id)).toEqual(["a", "c", "d", "b"]);
  });

  it("suggests unread stories from the same category", () => {
    const more = [...stories, s("e", "in-je-hoofd", "2026-07-05")];
    expect(relatedStories(more[0]!, more, new Set(["e"])).map((x) => x.id)).toEqual(["c", "e"]);
  });

  it("groups stories per category for the overview, newest first", () => {
    expect(
      storiesByCategory(stories).map((r) => [r.category, r.count, r.stories.map((x) => x.id)]),
    ).toEqual([
      ["in-je-hoofd", 2, ["c", "a"]],
      ["jong-zijn", 1, ["b"]],
      ["relaties", 1, ["d"]],
    ]);
  });

  it("splits stories and articles", () => {
    const items = [
      { id: "1", kind: "verhaal" },
      { id: "2", kind: "artikel" },
      { id: "3", kind: "iets-anders" },
    ];
    expect(ofKind(items, "verhaal").map((x) => x.id)).toEqual(["1", "3"]);
    expect(ofKind(items, "artikel").map((x) => x.id)).toEqual(["2"]);
    expect(kindForTab("artikelen").kind).toBe("artikel");
    expect(kindForTab(undefined).kind).toBe("verhaal");
  });
});
