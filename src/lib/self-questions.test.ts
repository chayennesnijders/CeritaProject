import { describe, expect, it } from "vitest";
import { SELF_QUESTIONS, questionForDay } from "./self-questions";

describe("questionForDay", () => {
  it("gives everyone the same question on a day, and a new one the next day", () => {
    expect(questionForDay("2026-11-02")).toBe(questionForDay("2026-11-02"));
    expect(questionForDay("2026-11-03")).not.toBe(questionForDay("2026-11-02"));
  });
  it("goes through all questions before repeating", () => {
    const days = Array.from({ length: SELF_QUESTIONS.length }, (_, i) =>
      new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10),
    );
    expect(new Set(days.map(questionForDay)).size).toBe(SELF_QUESTIONS.length);
  });
});
