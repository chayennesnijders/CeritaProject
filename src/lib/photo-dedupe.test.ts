import { describe, expect, it } from "vitest";
import { dHash, hamming, planDedupe, samePhoto } from "./photo-dedupe";

const gradient = (shift = 0) => Array.from({ length: 72 }, (_, i) => ((i % 9) * 20 + shift) % 256);
const noise = (seed: number) => Array.from({ length: 72 }, (_, i) => ((i * 7919 + seed * 104729) % 251));

describe("fingerprints", () => {
  it("are equal for the same picture, also a bit brighter", () => {
    expect(dHash(gradient())).toBe(dHash(gradient(10)));
    expect(samePhoto(dHash(gradient()), dHash(gradient(10)))).toBe(true);
  });
  it("differ for different pictures", () => {
    const a = dHash(noise(1));
    const b = dHash(noise(2));
    expect(a).toHaveLength(16);
    expect(hamming(a, b)).toBeGreaterThan(6);
    expect(samePhoto(a, b)).toBe(false);
  });
  it("count differing bits", () => {
    expect(hamming("0000000000000000", "0000000000000003")).toBe(2);
    expect(hamming("ffffffffffffffff", "0000000000000000")).toBe(64);
  });
});

describe("planDedupe", () => {
  const A = "0000000000000000";
  const A2 = "0000000000000001"; // the same photo, re-saved
  const B = "ffffffffffffffff";
  const C = "00000000ffffffff";
  const D = "ffffffff00000000";

  it("lets the first story keep its photo and gives the others a free one", () => {
    const plan = planDedupe(
      [
        { id: "1", image: "a.jpg", hash: A },
        { id: "2", image: "a-kopie.jpg", hash: A2 },
        { id: "3", image: "b.jpg", hash: B },
      ],
      [
        { path: "ook-a.jpg", hash: A },
        { path: "c.jpg", hash: C },
      ],
    );
    expect(plan).toEqual([{ id: "2", from: "a-kopie.jpg", to: "c.jpg" }]);
  });

  it("never hands out the same free photo twice", () => {
    const plan = planDedupe(
      [
        { id: "1", image: "a.jpg", hash: A },
        { id: "2", image: "a2.jpg", hash: A },
        { id: "3", image: "a3.jpg", hash: A },
      ],
      [
        { path: "c.jpg", hash: C },
        { path: "c-kopie.jpg", hash: C },
        { path: "d.jpg", hash: D },
      ],
    );
    expect(plan.map((p) => p.to)).toEqual(["c.jpg", "d.jpg"]);
  });

  it("removes the photo when no free one is left", () => {
    const plan = planDedupe(
      [
        { id: "1", image: "a.jpg", hash: A },
        { id: "2", image: "a2.jpg", hash: A },
      ],
      [],
    );
    expect(plan).toEqual([{ id: "2", from: "a2.jpg", to: null }]);
  });
});
