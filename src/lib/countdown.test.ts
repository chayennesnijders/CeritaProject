import { describe, expect, it } from "vitest";
import { COUNTDOWNS, countdownFor, countdownLength } from "./countdown";

describe("countdown questions", () => {
  it("has exactly one question for every day of each countdown, also in a leap year", () => {
    for (const c of COUNTDOWNS) {
      expect(c.questions.length).toBe(countdownLength(c, 2027));
      expect(c.questions.length).toBe(countdownLength(c, 2028));
      expect(new Set(c.questions).size).toBe(c.questions.length);
    }
  });
  it("counts down to oud & nieuw", () => {
    expect(countdownFor("2026-11-13")).toMatchObject({
      id: "oud-en-nieuw",
      day: 1,
      total: 49,
      headline: "Nog 48 dagen tot oud & nieuw",
    });
    expect(countdownFor("2026-12-30")?.headline).toBe("Nog 1 dag tot oud & nieuw");
    expect(countdownFor("2026-12-31")).toMatchObject({
      day: 49,
      headline: "Vandaag is het oudjaar",
    });
  });
  it("moves on to Valentijnsdag on 1 January", () => {
    expect(countdownFor("2027-01-01")).toMatchObject({
      id: "valentijn",
      day: 1,
      headline: "Nog 44 dagen tot Valentijnsdag",
    });
    expect(countdownFor("2027-02-14")?.headline).toBe("Vandaag is het Valentijnsdag");
  });
  it("is quiet outside the countdowns", () => {
    expect(countdownFor("2026-11-12")).toBeNull();
    expect(countdownFor("2027-03-01")).toBeNull();
  });
});
