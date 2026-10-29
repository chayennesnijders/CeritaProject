import { describe, expect, it } from "vitest";
import { ritiFor, ritiImage } from "./riti";

describe("Riti", () => {
  it("is happy along with you and comforts you when it is hard", () => {
    expect(ritiFor(null)).toBe("neutraal");
    expect(ritiFor("super")).toBe("trots");
    expect(ritiFor("goed")).toBe("blij");
    expect(ritiFor("gaat-wel")).toBe("denkend");
    expect(ritiFor("verdrietig")).toBe("troostend");
    expect(ritiFor("gestrest")).toBe("troostend");
  });

  it("has a drawing for every emotion", () => {
    expect(ritiImage("neutraal")).toBe("/riti/riti.webp");
    expect(ritiImage("troostend")).toBe("/riti/troostend.webp");
  });
});
