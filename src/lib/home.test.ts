import { describe, expect, it } from "vitest";
import { AFFIRMATIONS, affirmationFor, dutchHour, greeting, moodById, needsHelpLine } from "./home";

describe("home", () => {
  it("greets by time of day", () => {
    expect(greeting(3).text).toBe("Slaap lekker");
    expect(greeting(8).text).toBe("Goedemorgen");
    expect(greeting(14).text).toBe("Goedemiddag");
    expect(greeting(21).text).toBe("Goedenavond");
  });

  it("uses Dutch time for the hour", () => {
    expect(dutchHour(new Date("2026-07-01T10:30:00Z"))).toBe(12); // summer time
    expect(dutchHour(new Date("2026-12-01T23:30:00Z"))).toBe(0);
  });

  it("finds moods and shows help for heavy feelings", () => {
    expect(moodById("verdrietig")?.emoji).toBe("😢");
    expect(moodById("onbekend")).toBeNull();
    expect(needsHelpLine("gestrest")).toBe(true);
    expect(needsHelpLine("super")).toBe(false);
  });

  it("gives one sentence a day and another one on tap", () => {
    expect(affirmationFor("2026-10-29")).toBe(affirmationFor("2026-10-29"));
    expect(affirmationFor("2026-10-29", 1)).toBe(affirmationFor("2026-10-30"));
    const month = new Set(
      Array.from({ length: AFFIRMATIONS.length }, (_, i) => affirmationFor("2026-10-01", i)),
    );
    expect(month.size).toBe(AFFIRMATIONS.length);
  });
});
