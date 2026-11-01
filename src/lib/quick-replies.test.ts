import { describe, expect, it } from "vitest";
import { quickReplies } from "./quick-replies";
import { NEED_IDS } from "./needs";

describe("quickReplies", () => {
  it("has kind replies for every need, and a general set", () => {
    for (const id of NEED_IDS) expect(quickReplies(id).length).toBe(4);
    expect(quickReplies(null)).toContain("🫂 Je bent niet alleen");
  });
  it("never suggests advice when someone only wants to be heard", () => {
    expect(quickReplies("luisteren").join(" ")).not.toMatch(/tip|advies|mee/i);
  });
});
