import { describe, expect, it } from "vitest";
import { isDrawingChallenge, pushUndo } from "./drawing";

describe("drawing", () => {
  it("recognises drawing challenges", () => {
    expect(isDrawingChallenge("Teken iets waar je blij van wordt")).toBe(true);
    expect(isDrawingChallenge("Maak een tekening van je lievelingsplek")).toBe(true);
    expect(isDrawingChallenge("Schrijf drie dingen op")).toBe(false);
    expect(isDrawingChallenge(null)).toBe(false);
  });

  it("keeps only the last undo steps", () => {
    let s: number[] = [];
    for (let i = 1; i <= 5; i++) s = pushUndo(s, i, 3);
    expect(s).toEqual([3, 4, 5]);
  });
});
