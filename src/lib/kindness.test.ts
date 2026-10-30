import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { censor, isMean, MASK, MEAN_ALTERNATION } from "./kindness";

describe("kindness filter", () => {
  it("hides mean words but leaves normal words alone", () => {
    expect(censor("je bent een klootzak")).toBe(`je bent een ${MASK}`);
    expect(censor("Ga toch DOOD")).toBe(MASK);
    expect(censor("wat een kut dag")).toBe(`wat een ${MASK} dag`);
    expect(isMean("mijn moeder heeft kanker")).toBe(false);
    expect(isMean("wat een klote dag")).toBe(false);
    expect(isMean("ik woon in Kuttekoven? nee, in Utrecht")).toBe(false);
    expect(isMean("een eikeltje van de boom")).toBe(false);
    expect(isMean("Lulu is mijn hond")).toBe(false);
  });
  it("uses the same words as the database", () => {
    const sql = readFileSync("drizzle/migrations/0075_kind_and_cosy.sql", "utf8");
    expect(sql).toContain(MEAN_ALTERNATION);
  });
});
