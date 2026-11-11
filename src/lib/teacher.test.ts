import { describe, expect, it } from "vitest";
import { licenceEnd, sortForTeacher, teacherMayOpen } from "./teacher";

describe("teacher accounts", () => {
  it("only open the teacher pages", () => {
    expect(teacherMayOpen("/home")).toBe(true);
    expect(teacherMayOpen("/profiel")).toBe(true);
    for (const youth of [
      "/community",
      "/community/abc",
      "/berichten",
      "/ceritabuddy",
      "/ontdekken",
      "/dagboek",
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
});
