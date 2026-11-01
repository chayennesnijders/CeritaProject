import { describe, expect, it } from "vitest";
import { NEEDS, needById } from "./needs";

describe("needs", () => {
  it("has a label and a tip for the people who reply, for every need", () => {
    for (const n of NEEDS) {
      expect(n.label.length).toBeGreaterThan(3);
      expect(n.hint.length).toBeGreaterThan(20);
    }
  });
  it("finds a need, and nothing for an unknown or empty one", () => {
    expect(needById("luisteren")?.emoji).toBe("🤍");
    expect(needById("onzin")).toBeNull();
    expect(needById(null)).toBeNull();
  });
});
