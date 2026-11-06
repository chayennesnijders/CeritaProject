import { describe, expect, it } from "vitest";
import { fitWithin, shouldShrink } from "./shrink-image";

describe("fitWithin", () => {
  it("scales the longest side down to the maximum", () => {
    expect(fitWithin(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 });
  });
  it("never enlarges small photos", () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});

describe("shouldShrink", () => {
  const big = 3_000_000;
  it("shrinks big photos", () => {
    expect(shouldShrink({ type: "image/jpeg", size: big, name: "IMG_1.jpg" })).toBe(true);
    expect(shouldShrink({ type: "image/png", size: big, name: "screenshot.png" })).toBe(true);
  });
  it("leaves small photos, GIFs, drawings and other files alone", () => {
    expect(shouldShrink({ type: "image/jpeg", size: 100_000, name: "a.jpg" })).toBe(false);
    expect(shouldShrink({ type: "image/gif", size: big, name: "a.gif" })).toBe(false);
    expect(shouldShrink({ type: "image/png", size: big, name: "tekening.png" })).toBe(false);
    expect(shouldShrink({ type: "application/pdf", size: big, name: "a.pdf" })).toBe(false);
    expect(shouldShrink({ type: "video/mp4", size: big, name: "a.mp4" })).toBe(false);
  });
});
