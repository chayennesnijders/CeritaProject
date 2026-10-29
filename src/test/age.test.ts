import { describe, it, expect } from "vitest";
import { ageGroupFor } from "@/lib/auth";

const today = new Date(2026, 9, 15);
describe("leeftijdsomgevingen", () => {
  it("11 jaar is te jong", () => expect(ageGroupFor(new Date(2015, 0, 1), today)).toBe("too_young"));
  it("12 jaar is junior", () => expect(ageGroupFor(new Date(2014, 0, 1), today)).toBe("junior"));
  it("15 jaar is junior", () => expect(ageGroupFor(new Date(2011, 0, 1), today)).toBe("junior"));
  it("16 jaar is senior", () => expect(ageGroupFor(new Date(2010, 0, 1), today)).toBe("senior"));
  it("25 jaar is senior", () => expect(ageGroupFor(new Date(2001, 0, 1), today)).toBe("senior"));
  it("26 jaar is adult", () => expect(ageGroupFor(new Date(2000, 0, 1), today)).toBe("adult"));
  it("27 jaar is adult", () => expect(ageGroupFor(new Date(1999, 0, 1), today)).toBe("adult"));
  it("28 jaar: app zonder community", () => expect(ageGroupFor(new Date(1998, 0, 1), today)).toBe("no_community"));
});
