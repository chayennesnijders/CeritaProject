import { describe, expect, it } from "vitest";
import { promptFor, shakeJar } from "./gratitude";
import { platformOf, shouldShowInstall } from "./install";
import { inboxItems, inboxTotal } from "./inbox";
import { matches, searchTerm } from "./search";

describe("gratitude jar", () => {
  it("never gives the same note twice in a row", () => {
    const notes = [{ id: "a" }, { id: "b" }];
    expect(shakeJar(notes, "a", 0)?.id).toBe("b");
    expect(shakeJar([{ id: "a" }], "a", 0.9)?.id).toBe("a");
    expect(shakeJar([], null, 0.5)).toBeNull();
    expect(promptFor("2026-10-30")).toBe(promptFor("2026-10-30"));
  });
});

describe("search", () => {
  it("cleans the term and matches all words", () => {
    expect(searchTerm("  %angst, ")).toBe("angst");
    expect(searchTerm("a")).toBeNull();
    expect(matches("Omgaan met Faalangst op school", "school faalangst")).toBe(true);
    expect(matches("Créatief schrijven", "creatief")).toBe(true);
    expect(matches("Gamen", "film")).toBe(false);
  });
});

describe("install guide", () => {
  it("only on a phone, once, and not when installed", () => {
    expect(platformOf("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe("ios");
    expect(platformOf("Mozilla/5.0 (Linux; Android 14)")).toBe("android");
    expect(shouldShowInstall({ platform: "ios", standalone: false, seen: false })).toBe(true);
    expect(shouldShowInstall({ platform: "ios", standalone: true, seen: false })).toBe(false);
    expect(shouldShowInstall({ platform: "other", standalone: false, seen: false })).toBe(false);
  });
});

describe("meldingen", () => {
  it("lists what wants attention and leaves out empty kinds", () => {
    const items = inboxItems({
      dms: 2,
      requests: 0,
      groups: 0,
      compliments: 1,
      answers: 0,
      myTurn: [{ id: "g1", game: "🎱 Pool", where: "/berichten/c1?spel=g1" }],
      letters: 0,
      replies: 0,
      meetups: [],
    });
    expect(items.map((x) => x.title)).toEqual([
      "2 nieuwe berichten",
      "Jouw beurt: 🎱 Pool",
      "Iemand gaf je een compliment",
    ]);
    expect(inboxTotal(items)).toBe(4);
  });
});
