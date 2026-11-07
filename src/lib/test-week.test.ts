import { describe, expect, it } from "vitest";
import { TEST_CHECKLIST, TEST_ITEM_COUNT, feedbackMessage, hasAnyAnswer } from "./test-week";

describe("test week", () => {
  it("has unique checklist ids", () => {
    const ids = TEST_CHECKLIST.flatMap((g) => g.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(TEST_ITEM_COUNT).toBe(ids.length);
  });
  it("puts all answers in one message that fits the limit", () => {
    const m = feedbackMessage(
      { phone: "Android", score: 8, why: "leuk", answers: { leukst: "het diertje" } },
      12,
    );
    expect(m).toMatch(/12 van/);
    expect(m).toMatch(/8\/10 · leuk/);
    expect(m).toMatch(/het diertje/);
    const long = feedbackMessage(
      { phone: "x", score: 1, why: "", answers: { mis: "a".repeat(5000) } },
      0,
    );
    expect(long.length).toBeLessThanOrEqual(2000);
  });
  it("can be sent before everything is ticked off", () => {
    const empty = { phone: "", score: null, why: "", answers: {} };
    expect(hasAnyAnswer(empty)).toBe(false);
    expect(hasAnyAnswer({ ...empty, answers: { leukst: "  " } })).toBe(false);
    expect(hasAnyAnswer({ ...empty, answers: { leukst: "de groepen" } })).toBe(true);
    expect(hasAnyAnswer({ ...empty, score: 7 })).toBe(true);
    expect(feedbackMessage({ ...empty, score: 7 }, 3)).toMatch(/tussendoor/);
    expect(feedbackMessage({ ...empty, score: 7 }, TEST_ITEM_COUNT)).not.toMatch(/tussendoor/);
  });
});
