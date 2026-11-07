import { describe, expect, it } from "vitest";
import { allAnswered, answeredCount, feedbackMessage, hasAnyAnswer, joinMulti, openQuestions, splitMulti, TEST_FORM } from "./test-week";

describe("test questions for young testers", () => {
  it("has unique question ids and options where needed", () => {
    const ids = TEST_FORM.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of TEST_FORM) if (q.kind === "choice" || q.kind === "multi") expect(q.options.length).toBeGreaterThan(1);
    expect(ids).toEqual(expect.arrayContaining(["telefoon", "cijfer", "waarom"]));
  });
  it("can be sent as soon as one question is answered", () => {
    expect(hasAnyAnswer({})).toBe(false);
    expect(hasAnyAnswer({ leukst: "   " })).toBe(false);
    expect(hasAnyAnswer({ leukst: "de groepen" })).toBe(true);
    expect(answeredCount({ telefoon: "iPhone", cijfer: "8", onbekend: "x" })).toBe(2);
  });
  it("stores several choices in one answer", () => {
    expect(joinMulti(["Groepen", "Diertje"])).toBe("Groepen, Diertje");
    expect(splitMulti("Groepen, Diertje")).toEqual(["Groepen", "Diertje"]);
    expect(splitMulti(undefined)).toEqual([]);
  });
  it("puts all answers in one message that fits the limit", () => {
    const m = feedbackMessage({ telefoon: "Android", cijfer: "8", leukst: "het diertje" });
    expect(m).toMatch(/3 van \d+ vragen/);
    expect(m).toMatch(/het diertje/);
    expect(m).toMatch(/Android/);
    expect(feedbackMessage({ mis: "a".repeat(5000) }).length).toBeLessThanOrEqual(2000);
  });
  it("needs every question answered before sending", () => {
    const all = Object.fromEntries(TEST_FORM.map((q) => [q.id, "x"]));
    expect(allAnswered(all)).toBe(true);
    const { leukst: _skip, ...missing } = all;
    expect(allAnswered(missing)).toBe(false);
    expect(openQuestions({ ...missing, mis: " " }).map((q) => q.id)).toEqual(["leukst", "mis"]);
  });
});
