import { describe, expect, it } from "vitest";
import {
  FEELINGS,
  PET_GAMES,
  THOUGHTS,
  bestScores,
  breathPhase,
  feelingRound,
  makeMemoryDeck,
  memoryScore,
  oddGridSize,
  oddRound,
  rewardMessage,
  stroopRound,
} from "./pet-games";

describe("pet games", () => {
  it("opens one new game per level, starting at level 1", () => {
    expect(PET_GAMES.map((g) => g.level)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("memory deck holds every emoji exactly twice", () => {
    const deck = makeMemoryDeck(["🍓", "🦴", "🐟"]);
    expect([...deck].sort()).toEqual(["🍓", "🍓", "🐟", "🐟", "🦴", "🦴"].sort());
  });

  it("memory score drops with extra turns but stays positive", () => {
    expect(memoryScore(6, 6)).toBe(100);
    expect(memoryScore(8, 6)).toBe(90);
    expect(memoryScore(60, 6)).toBe(10);
  });

  it("breathes 4 seconds in, 4 seconds out", () => {
    expect(breathPhase(0)).toBe("in");
    expect(breathPhase(3999)).toBe("in");
    expect(breathPhase(4000)).toBe("uit");
    expect(breathPhase(8000)).toBe("in");
  });

  it("stroop rounds answer with the ink colour", () => {
    for (let i = 0; i < 50; i++) {
      const r = stroopRound();
      expect(["rood", "blauw", "groen", "geel"]).toContain(r.ink);
    }
  });

  it("feeling rounds offer 3 different options including the answer", () => {
    for (let i = 0; i < 50; i++) {
      const r = feelingRound();
      expect(new Set(r.options).size).toBe(3);
      expect(r.options).toContain(r.answer.name);
    }
    expect(new Set(FEELINGS.map((f) => f.name)).size).toBe(FEELINGS.length);
  });

  it("every thought to let go has a kinder version", () => {
    expect(THOUGHTS.filter((t) => !t.keep).every((t) => !!t.kinder)).toBe(true);
    expect(THOUGHTS.filter((t) => t.keep).length).toBe(THOUGHTS.filter((t) => !t.keep).length);
  });

  it("odd one out grid grows and the odd one is inside it", () => {
    expect([oddGridSize(0), oddGridSize(3), oddGridSize(7)]).toEqual([3, 4, 5]);
    for (let i = 0; i < 50; i++) {
      const r = oddRound(i % 10);
      expect(r.oddIndex).toBeLessThan(r.size * r.size);
      expect(r.same).not.toBe(r.odd);
    }
  });

  it("keeps the best score per game and explains the daily XP", () => {
    expect(
      bestScores([
        { game: "memory", score: 70 },
        { game: "memory", score: 90 },
      ]),
    ).toEqual({ memory: 90 });
    expect(rewardMessage(5)).toContain("+5 XP");
    expect(rewardMessage(0)).toContain("Spelen mag altijd");
  });
});
