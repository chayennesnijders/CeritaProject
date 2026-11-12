import { describe, expect, it } from "vitest";
import {
  TEACHER_TASKS,
  TEACHER_TIPS,
  licenceEnd,
  sortForTeacher,
  teacherDay,
  teacherMayOpen,
} from "./teacher";

describe("teacher accounts", () => {
  it("only open the teacher pages", () => {
    expect(teacherMayOpen("/home")).toBe(true);
    expect(teacherMayOpen("/profiel")).toBe(true);
    expect(teacherMayOpen("/dagboek")).toBe(true);
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
});
