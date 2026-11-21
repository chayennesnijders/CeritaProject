import { describe, expect, it } from "vitest";
import { SCHOOL_LINKS, SCHOOL_QUESTIONS, SCHOOL_RULES, SCHOOL_SHEET, SCHOOL_STEPS, schoolLetter } from "./school-pack";

describe("school pack", () => {
  it("letter fills in the names, or leaves clear placeholders", () => {
    expect(schoolLetter("meneer De Vries", "Sam")).toMatch(/^Beste meneer De Vries,/);
    expect(schoolLetter("meneer De Vries", "Sam").trim().endsWith("Sam")).toBe(true);
    expect(schoolLetter("", " ")).toContain("[naam]");
    expect(schoolLetter("", "")).toContain("[jouw naam]");
  });
  it("letter points to the lessons page and never asks for pupils' details", () => {
    const l = schoolLetter("x", "y");
    expect(l).toContain(SCHOOL_LINKS.lessons);
    expect(l).not.toMatch(/wachtlijst|telefoon|adres|e-?mail van|namen van/i);
  });
  it("rules keep it away from primary schools and other pupils' details", () => {
    expect(SCHOOL_RULES.join(" ")).toMatch(/niet bij basisscholen/);
    expect(SCHOOL_RULES.join(" ")).toMatch(/nooit namen, nummers/);
  });
  it("has four steps, answers about privacy and safety, and a sheet", () => {
    expect(SCHOOL_STEPS).toHaveLength(4);
    expect(SCHOOL_QUESTIONS.map((q) => q.q).join(" ")).toMatch(/veilig/);
    expect(SCHOOL_QUESTIONS.map((q) => q.q).join(" ")).toMatch(/gegevens/);
    expect(SCHOOL_SHEET.points.length).toBeGreaterThanOrEqual(4);
  });
});
