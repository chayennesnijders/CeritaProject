import { describe, expect, it } from "vitest";
import { TEST_CHECKLIST, TEST_ITEM_COUNT, feedbackMessage } from "./test-week";

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
});
