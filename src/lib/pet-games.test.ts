import { describe, expect, it } from "vitest";
import { bestScores, makeMemoryDeck, memoryScore, rewardMessage } from "./pet-games";

describe("pet games", () => {
  it("memory deck holds every emoji exactly twice", () => {
    const deck = makeMemoryDeck(["🍓", "🦴", "🐟"]);
    expect(deck).toHaveLength(6);
    expect([...deck].sort()).toEqual(["🍓", "🍓", "🐟", "🐟", "🦴", "🦴"].sort());
  });

  it("memory score drops with extra turns but stays positive", () => {
    expect(memoryScore(6, 6)).toBe(100);
    expect(memoryScore(8, 6)).toBe(90);
    expect(memoryScore(60, 6)).toBe(10);
  });

  it("keeps the best score per game", () => {
    expect(
      bestScores([
        { game: "memory", score: 70 },
        { game: "memory", score: 90 },
        { game: "vangen", score: 12 },
      ]),
    ).toEqual({ memory: 90, vangen: 12 });
  });

  it("explains when there is no XP left today", () => {
    expect(rewardMessage(5)).toContain("+5 XP");
    expect(rewardMessage(0)).toContain("Spelen mag altijd");
  });
});
