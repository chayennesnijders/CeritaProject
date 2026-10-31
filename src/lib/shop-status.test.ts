import { describe, expect, it } from "vitest";
import { canEnterShop } from "./shop-status";

describe("canEnterShop", () => {
  it("keeps members out until the shop opens, admins can always look", () => {
    expect(canEnterShop({ isAdmin: false }, false)).toBe(false);
    expect(canEnterShop(null, false)).toBe(false);
    expect(canEnterShop({ isAdmin: true }, false)).toBe(true);
    expect(canEnterShop({ isAdmin: false }, true)).toBe(true);
  });
});
