import { describe, expect, it } from "vitest";
import { BAND_QUESTIONS, BAND_TIPS, bandsLabel, CHILD_BANDS, childQuestions, childTip, childTips, isChildBand } from "./child-age";
import { PARENT_FOR_CHILD, PARENT_QUESTIONS } from "./parent";

describe("tips by the child's age", () => {
  it("has tips and questions for every age group", () => {
    for (const b of CHILD_BANDS) {
      expect(BAND_TIPS[b.id].length).toBeGreaterThanOrEqual(8);
      expect(BAND_QUESTIONS[b.id].length).toBeGreaterThanOrEqual(6);
    }
    expect(isChildBand("13-15")).toBe(true);
    expect(isChildBand("12")).toBe(false);
  });
  it("gives a general tip when no age is chosen", () => {
    const t = childTip("2026-11-07", []);
    expect(t.band).toBeNull();
    expect(PARENT_FOR_CHILD).toContain(t.text);
  });
  it("gives a tip that fits the chosen age, the same all day", () => {
    const t = childTip("2026-11-07", ["4-9"]);
    expect(t.band).toBe("4-9");
    expect(BAND_TIPS["4-9"]).toContain(t.text);
    expect(childTip("2026-11-07", ["4-9"])).toEqual(t);
    expect(childTip("2026-11-08", ["4-9"]).text).not.toBe(t.text);
  });
  it("gives one tip per chosen age group, every day", () => {
    const t = childTips("2026-11-09", ["16-18", "0-3"]);
    expect(t.map((x) => x.band)).toEqual(["0-3", "16-18"]);
    expect(BAND_TIPS["0-3"]).toContain(t[0]!.text);
    expect(BAND_TIPS["16-18"]).toContain(t[1]!.text);
    expect(childTips("2026-11-10", ["16-18", "0-3"])[0]!.text).not.toBe(t[0]!.text);
    expect(childTips("2026-11-09", [])).toHaveLength(1);
    expect(childTips("2026-11-09", [])[0]!.band).toBeNull();
  });
  it("takes turns between two children", () => {
    const bands = new Set(
      ["2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10"].map((d) => childTip(d, ["16-18", "0-3"]).band),
    );
    expect(bands).toEqual(new Set(["0-3", "16-18"]));
  });
  it("gives things to do together for toddlers and questions for older children", () => {
    expect(childQuestions([]).length).toBe(PARENT_QUESTIONS.length);
    expect(childQuestions(["0-3"]).every((q) => q.together)).toBe(true);
    expect(childQuestions(["13-15"]).some((q) => q.together)).toBe(false);
    const mixed = childQuestions(["0-3", "13-15"]);
    expect(mixed[0]!.band).toBe("0-3");
    expect(mixed[1]!.band).toBe("13-15");
  });
  it("labels the chosen ages", () => {
    expect(bandsLabel(["13-15"])).toBe("13–15 jaar");
    expect(bandsLabel(["16-18", "4-9"])).toBe("4–9 en 16–18 jaar");
    expect(bandsLabel(["19+"])).toBe("19+ jaar");
    expect(bandsLabel([])).toBe("");
  });
});
