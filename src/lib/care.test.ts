import { describe, expect, it } from "vitest";
import { needsCare } from "./care";

const CARE_YES = [
  "Soms wil ik er niet meer zijn",
  "ik denk aan zelfmoord",
  "Ik wil gewoon dood",
  "ik zie het echt niet meer zitten",
  "ik wil mezelf pijn doen",
  "ik heb mezelf weer gesneden",
  "ik snij soms in mezelf",
  "ik wil niet meer leven",
  "Niemand zou me missen",
  "iedereen is beter af zonder mij",
  "gedachten over suïcide",
];
const CARE_NO = [
  "Ik ga dood van het lachen 😂",
  "ik ben zo moe vandaag",
  "die film was doodeng",
  "ik wil niet meer naar die school",
  "ik zie het helemaal zitten!",
];

describe("needsCare", () => {
  it("notices worrying words", () => {
    for (const t of CARE_YES) expect(needsCare(t), t).toBe(true);
  });
  it("leaves normal messages alone", () => {
    for (const t of CARE_NO) expect(needsCare(t), t).toBe(false);
  });
});

describe("needs_care in the database", () => {
  it("uses exactly the same words", async () => {
    const { readFileSync } = await import("node:fs");
    const sql = readFileSync("drizzle/migrations/0064_organisations_ready.sql", "utf8");
    const { CARE_PATTERN } = await import("./care");
    expect(sql).toContain(`~* $re$${CARE_PATTERN}$re$`);
  });
});
