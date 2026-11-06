import { describe, expect, it } from "vitest";
import { feedSlides, isDoubleTap, PAUSE_EVERY, storyHook, swipeOrder } from "./swipe-feed";

const s = (id: string) => ({ id });

describe("swipe feed", () => {
  it("puts the chosen story first, then unread, then read", () => {
    const list = [s("a"), s("b"), s("c"), s("d")];
    expect(swipeOrder(list, new Set(["a", "c"])).map((x) => x.id)).toEqual(["b", "d", "a", "c"]);
    expect(swipeOrder(list, new Set(["a"]), "c").map((x) => x.id)).toEqual(["c", "b", "d", "a"]);
    expect(swipeOrder(list, new Set(), "zz").map((x) => x.id)).toEqual(["a", "b", "c", "d"]);
  });
  it("adds a pause card regularly and an end card", () => {
    const list = Array.from({ length: PAUSE_EVERY * 2 + 1 }, (_, i) => s(String(i)));
    const slides = feedSlides(list);
    expect(slides.filter((x) => x.type === "pauze")).toHaveLength(2);
    expect(slides[PAUSE_EVERY]).toEqual({ type: "pauze", seen: PAUSE_EVERY });
    expect(slides.at(-1)).toEqual({ type: "einde" });
    expect(feedSlides([])).toEqual([]);
  });
  it("opens with whole sentences and skips photos and short lines", () => {
    const body =
      "[[foto:x.jpg]]\n\nAnoniem, 17\n\nIk was twaalf toen het begon. Elke ochtend had ik buikpijn voor school. Niemand wist het, ook mijn moeder niet. " +
      "Pas veel later durfde ik het te vertellen, en dat veranderde alles voor mij en mijn familie.";
    const hook = storyHook(body, 120);
    expect(hook.startsWith("Ik was twaalf")).toBe(true);
    expect(hook.endsWith(".")).toBe(true);
    expect(hook.length).toBeLessThanOrEqual(120);
    expect(storyHook("Kort verhaal dat helemaal past in de kaart, zonder iets weg te laten.")).toContain("weg te laten.");
  });
  it("recognises a double tap", () => {
    expect(isDoubleTap(1000, 1200)).toBe(true);
    expect(isDoubleTap(1000, 1500)).toBe(false);
    expect(isDoubleTap(0, 0)).toBe(false);
  });
});
