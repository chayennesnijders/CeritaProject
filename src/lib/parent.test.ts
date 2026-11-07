import { describe, expect, it } from "vitest";
import {
  dayNumber,
  nextQuestion,
  PARENT_FOR_CHILD,
  PARENT_MOOD_REPLY,
  PARENT_QUESTIONS,
  PARENT_SELF,
  parentDay,
  parentMayOpen,
  telHref,
  todayProgress,
  weekDots,
} from "./parent";
import { MOODS } from "./home";
import { THEME_DAYS, themeDaysOn, themeTip } from "./theme-days";

describe("parent day", () => {
  it("gives the same assignment and tip all day, and a new one tomorrow", () => {
    const a = parentDay("2026-11-06");
    expect(parentDay("2026-11-06")).toEqual(a);
    expect(parentDay("2026-11-07").self).not.toBe(a.self);
    expect(PARENT_SELF).toContain(a.self);
    expect(PARENT_FOR_CHILD).toContain(a.child);
  });
  it("counts days from 1 January 2026, also before it", () => {
    expect(dayNumber("2026-01-01")).toBe(0);
    expect(dayNumber("2026-01-31")).toBe(30);
    expect(parentDay("2025-12-31").self).toBe(PARENT_SELF[PARENT_SELF.length - 1]);
  });
  it("only lets parents open their own pages", () => {
    expect(parentMayOpen("/home")).toBe(true);
    expect(parentMayOpen("/stemming")).toBe(true);
    expect(parentMayOpen("/community")).toBe(false);
    expect(parentMayOpen("/berichten/abc")).toBe(false);
    expect(parentMayOpen("/ceritabuddy")).toBe(false);
    expect(parentMayOpen("/homeless")).toBe(false);
    expect(parentMayOpen("/handleidingen/gesprek-beginnen")).toBe(true);
    expect(parentMayOpen("/testlijst")).toBe(true);
    expect(parentMayOpen("/dagboek")).toBe(true);
    expect(parentMayOpen("/diertje")).toBe(true);
    expect(parentMayOpen("/shop")).toBe(false);
  });
});

describe("theme days", () => {
  it("finds a day and periods that include it", () => {
    expect(themeDaysOn("2027-09-10").map((t) => t.title)).toEqual(["Wereld Suïcidepreventiedag"]);
    expect(themeDaysOn("2026-12-25").map((t) => t.title)).toEqual(["Kerst"]);
    expect(themeDaysOn("2026-12-05").map((t) => t.title)).toEqual(["Sinterklaas", "Orange the World"]);
    expect(themeDaysOn("2027-01-15")).toEqual([]);
  });
  it("has a tip for young people and parents on every day, and help lines on the heavy ones", () => {
    for (const t of THEME_DAYS) {
      expect(themeTip(t, "jongeren")).toBeTruthy();
      expect(themeTip(t, "ouders")).toBeTruthy();
      expect(t.to === undefined || t.to >= t.from).toBe(true);
    }
    expect(THEME_DAYS.find((t) => t.from === "2027-09-10")?.help).toContain("113");
  });
});

describe("parent home helpers", () => {
  it("counts today's progress, with or without the mood", () => {
    expect(todayProgress({ self: true, child: false, mood: true })).toEqual({ done: 2, total: 3 });
    expect(todayProgress({ self: true, child: true })).toEqual({ done: 2, total: 2 });
  });
  it("shows Monday to Sunday with the days something was done", () => {
    const week = weekDots("2026-11-06", ["2026-11-02", "2026-11-06", "2026-10-30"]);
    expect(week.map((d) => d.label)).toEqual(["ma", "di", "wo", "do", "vr", "za", "zo"]);
    expect(week[0]).toMatchObject({ day: "2026-11-02", done: true, today: false });
    expect(week[4]).toMatchObject({ day: "2026-11-06", done: true, today: true });
    expect(week[5]!.future).toBe(true);
    expect(weekDots("2026-11-08", [])[6]!.today).toBe(true);
  });
  it("never shows the same question twice in a row", () => {
    for (let i = 0; i < PARENT_QUESTIONS.length; i++)
      for (const r of [0, 0.5, 0.999]) {
        const n = nextQuestion(i, () => r);
        expect(n).not.toBe(i);
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThan(PARENT_QUESTIONS.length);
      }
  });
  it("has a reply for every mood and dialable numbers", () => {
    for (const m of MOODS) expect(PARENT_MOOD_REPLY[m.id]).toBeDefined();
    expect(telHref("088-0767000")).toBe("tel:0880767000");
    expect(telHref("0800-0113")).toBe("tel:08000113");
  });
});
