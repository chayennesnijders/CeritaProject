import { describe, expect, it } from "vitest";
import {
  TEACHER_TASKS,
  TEACHER_TIPS,
  licenceEnd,
  sortForTeacher,
  teacherDay,
  teacherMayOpen,
  levelOf,
  lessonsForLevels,
} from "./teacher";

describe("teacher accounts", () => {
  it("only open the teacher pages", () => {
    expect(teacherMayOpen("/home")).toBe(true);
    expect(teacherMayOpen("/profiel")).toBe(true);
    expect(teacherMayOpen("/dagboek")).toBe(true);
    expect(teacherMayOpen("/mijn-lessen")).toBe(true);
    for (const youth of [
      "/community",
      "/community/abc",
      "/berichten",
      "/ceritabuddy",
      "/ontdekken",
      "/vrienden",
      "/buddy",
    ])
      expect(teacherMayOpen(youth)).toBe(false);
    expect(teacherMayOpen("/homework")).toBe(false);
  });
  it("puts unlocked lessons first and keeps the order", () => {
    const l = [
      { id: "a", unlocked: false },
      { id: "b", unlocked: true },
      { id: "c", unlocked: true },
    ];
    expect(sortForTeacher(l).map((x) => x.id)).toEqual(["b", "c", "a"]);
  });
  it("writes the licence end date in Dutch", () => {
    expect(licenceEnd("2027-07-31")).toBe("31 juli 2027");
  });
  it("gives a tip, task and diary question every day, the same for everyone", () => {
    const a = teacherDay("2026-11-12");
    expect(a).toEqual(teacherDay("2026-11-12"));
    expect(teacherDay("2026-11-13").tip).not.toBe(a.tip);
    expect(teacherDay("2026-11-13").task).not.toBe(a.task);
    expect(a.tip && a.task && a.reflect).toBeTruthy();
    expect(teacherDay("2025-01-01").tip).toBeTruthy();
  });
  it("always point to real help", () => {
    expect(TEACHER_TIPS.some((t) => t.includes("112"))).toBe(true);
    expect([...TEACHER_TIPS, ...TEACHER_TASKS].some((t) => t.includes("0800-0432"))).toBe(true);
  });
  it("knows which group a lesson is for", () => {
    expect(levelOf("Groep 7/8")).toBe("groep78");
    expect(levelOf("groep 7 en 8")).toBe("groep78");
    expect(levelOf("Klas 1 t/m 3")).toBe("klas13");
    expect(levelOf("Klas 2 t/m 4")).toBe("klas13");
    expect(levelOf("Klas 4 t/m 6")).toBe("klas46");
    expect(levelOf("Bovenbouw")).toBe("klas46");
    expect(levelOf("Iedereen")).toBeNull();
    expect(levelOf(null)).toBeNull();
  });
  it("shows only the lessons for the chosen groups", () => {
    const l = [
      { id: "a", audience: "Groep 7/8" },
      { id: "b", audience: "Klas 1 t/m 3" },
      { id: "c", audience: "Klas 4 t/m 6" },
      { id: "d", audience: "" },
    ];
    expect(lessonsForLevels(l, []).map((x) => x.id)).toEqual(["a", "b", "c", "d"]);
    expect(lessonsForLevels(l, ["groep78"]).map((x) => x.id)).toEqual(["a", "d"]);
    expect(lessonsForLevels(l, ["klas13", "klas46"]).map((x) => x.id)).toEqual(["b", "c", "d"]);
  });
});
