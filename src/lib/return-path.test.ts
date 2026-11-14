import { describe, expect, it } from "vitest";
import { safeReturnPath } from "./return-path";

describe("safeReturnPath", () => {
  it("keeps paths inside the app", () => {
    expect(safeReturnPath("/testlijst")).toBe("/testlijst");
    expect(safeReturnPath("/dagboek?x=1")).toBe("/dagboek?x=1");
  });
  it("falls back to home for anything else", () => {
    for (const v of [null, undefined, "", "https://evil.example", "//evil.example", "/\\evil", "/auth", "/bevestig?x", "/api/buddy"])
      expect(safeReturnPath(v)).toBe("/home");
  });
});
