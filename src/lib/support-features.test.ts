import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { INTERESTS, MAX_INTERESTS, toggleInterest } from "./buddy";
import { eventStatus, remindNow } from "./events";
import { daysUntil, letterWaitText, LETTER_MONTHS } from "./letters";
import { inQuietHours } from "./quiet-hours";
import { phoneIn, PLAN_SECTIONS, stepsFilled, toPlan } from "./safety-plan";
import { speechChunks } from "./read-aloud";
import { textSizePx, TEXT_SIZE_BOOT, TEXT_SIZES } from "./text-size";

const sql = readFileSync("drizzle/migrations/0074_support_features.sql", "utf8");

describe("quiet hours", () => {
  it("works across midnight and when off", () => {
    expect(inQuietHours(23, 22, 7)).toBe(true);
    expect(inQuietHours(6, 22, 7)).toBe(true);
    expect(inQuietHours(7, 22, 7)).toBe(false);
    expect(inQuietHours(12, 8, 15)).toBe(true);
    expect(inQuietHours(16, 8, 15)).toBe(false);
    expect(inQuietHours(3, null, null)).toBe(false);
  });
});

describe("safety plan", () => {
  it("cleans what is stored and counts the steps", () => {
    const plan = toPlan({ signalen: ["slecht slapen", 5], onbekend: ["x"], mensen: [] });
    expect(plan.signalen).toEqual(["slecht slapen"]);
    expect(Object.keys(plan)).toEqual(PLAN_SECTIONS.map((s) => s.id));
    expect(stepsFilled(plan)).toBe(1);
    expect(toPlan(null).waarom).toEqual([]);
  });
  it("finds a phone number to call", () => {
    expect(phoneIn("mama – 06 12345678")).toBe("0612345678");
    expect(phoneIn("Kindertelefoon 0800-0432")).toBe("08000432");
    expect(phoneIn("mijn kat")).toBeNull();
  });
});

describe("letters", () => {
  it("counts down to the day it may open", () => {
    expect(daysUntil("2026-11-30", "2026-10-30")).toBe(31);
    expect(letterWaitText("2026-10-30", "2026-10-30")).toBe("Mag open!");
    expect(letterWaitText("2026-10-31", "2026-10-30")).toBe("Morgen mag hij open");
    expect(letterWaitText("2027-04-30", "2026-10-30")).toBe("Nog 6 maanden");
  });
  it("offers the same months as the database", () => {
    expect(sql).toContain(`_months NOT IN (${LETTER_MONTHS.join(", ")})`);
  });
});

describe("events", () => {
  it("knows when a meetup is on and when to remind", () => {
    const now = new Date("2026-10-30T18:30:00Z");
    expect(eventStatus("2026-10-30T19:00:00Z", 60, now)).toBe("straks");
    expect(eventStatus("2026-10-30T18:00:00Z", 60, now)).toBe("bezig");
    expect(eventStatus("2026-10-30T17:00:00Z", 60, now)).toBe("voorbij");
    expect(remindNow("2026-10-30T19:00:00Z", now)).toBe(true);
    expect(remindNow("2026-10-30T21:00:00Z", now)).toBe(false);
  });
});

describe("buddy", () => {
  it("keeps at most 8 interests like the database", () => {
    let list: string[] = [];
    for (const i of INTERESTS) list = toggleInterest(list, i.id);
    expect(list).toHaveLength(MAX_INTERESTS);
    expect(toggleInterest(list, list[0]!)).toHaveLength(MAX_INTERESTS - 1);
    expect(sql).toContain(`cardinality(interests) <= ${MAX_INTERESTS}`);
  });
});

describe("reading aloud", () => {
  it("splits long texts at sentences", () => {
    const text = "Dit is zin een. Dit is zin twee! En nog een derde zin?";
    expect(speechChunks(text, 30)).toEqual([
      "Dit is zin een.",
      "Dit is zin twee!",
      "En nog een derde zin?",
    ]);
    expect(speechChunks("a".repeat(500), 220).every((c) => c.length <= 220)).toBe(true);
    expect(speechChunks("   ")).toEqual([]);
  });
});

describe("text size", () => {
  it("maps sizes to pixels, also in the boot script", () => {
    expect(textSizePx("groot")).toBe(18);
    expect(textSizePx("onzin")).toBe(16);
    for (const t of TEXT_SIZES.filter((x) => x.id !== "normaal"))
      expect(TEXT_SIZE_BOOT).toContain(`${t.id}:${t.px}`);
  });
});
