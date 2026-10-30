import { describe, expect, it } from "vitest";
import { BADGES, earnedBadges, type BadgeStats } from "./badges";
import { BREATH_CYCLE, breathAt } from "./breathing";
import { COMPLIMENTS, COMPLIMENT_IDS } from "./compliments";
import { GROUP_CHALLENGE_GOAL, challengeForWeek, mondayOf } from "./group-challenge";
import { monthGrid, moodCounts, moodStreak } from "./mood-calendar";
import { pollFormError, tally } from "./polls";
import { REACTIONS, byMessage, summarize } from "./reactions";
import { STICKERS, stickerBody, stickerById } from "./stickers";
import { readFileSync } from "node:fs";

const sql = readFileSync("drizzle/migrations/0071_fun_features.sql", "utf8");

describe("reactions", () => {
  it("groups per emoji and knows yours", () => {
    const r = [
      { emoji: "❤️", user_id: "a", post_id: "p" },
      { emoji: "😂", user_id: "b", post_id: "p" },
      { emoji: "❤️", user_id: "c", post_id: "p" },
      { emoji: "👍", user_id: "a", message_id: "m" },
    ];
    expect(summarize(byMessage(r).get("p")!, "b")).toEqual({
      list: [
        { emoji: "❤️", count: 2 },
        { emoji: "😂", count: 1 },
      ],
      mine: "😂",
    });
    expect(byMessage(r).get("m")).toHaveLength(1);
  });
  it("uses the same emojis as the database", () => {
    for (const e of REACTIONS) expect(sql).toContain(`'${e}'`);
  });
});

describe("polls", () => {
  it("checks the form and counts votes", () => {
    expect(pollFormError("Hé", ["a", "b"])).toContain("vraag");
    expect(pollFormError("Welke film?", ["Shrek", " "])).toContain("2 antwoorden");
    expect(pollFormError("Welke film?", ["Shrek", "Frozen"])).toBeNull();
    expect(tally(3, [{ option: 0 }, { option: 0 }, { option: 2 }, { option: 9 }])).toEqual({
      total: 3,
      counts: [2, 0, 1],
      percents: [67, 0, 33],
    });
  });
});

describe("stickers", () => {
  it("have short ids the database accepts", () => {
    for (const s of STICKERS) expect(s.id).toMatch(/^[a-z]{2,20}$/);
    expect(stickerById("knuffel")?.text).toBe("Knuffel!");
    expect(stickerBody("hoi")).toBe("🧸 Hoi!");
  });
});

describe("mood calendar", () => {
  it("lays out a month starting on Monday", () => {
    const weeks = monthGrid(2026, 10); // 1 October 2026 is a Thursday
    expect(weeks[0]).toEqual([
      null,
      null,
      null,
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
    expect(weeks.flat().filter(Boolean)).toHaveLength(31);
  });
  it("counts the streak, also when today is still open", () => {
    const days = ["2026-10-27", "2026-10-28", "2026-10-29"];
    expect(moodStreak(days, "2026-10-29")).toBe(3);
    expect(moodStreak(days, "2026-10-30")).toBe(3);
    expect(moodStreak(days, "2026-10-31")).toBe(0);
    expect(
      moodCounts(
        [
          { day: "2026-10-01", mood: "goed" },
          { day: "2026-10-02", mood: "goed" },
          { day: "2026-09-02", mood: "super" },
        ],
        "2026-10",
      ),
    ).toEqual([expect.objectContaining({ count: 2 })]);
  });
  it("only stores moods the database knows", () => {
    for (const id of ["super", "goed", "gaat-wel", "verdrietig", "gestrest"])
      expect(sql).toContain(`'${id}'`);
  });
});

describe("breathing", () => {
  it("goes in, holds and out, then starts a new round", () => {
    expect(breathAt(0).phase.id).toBe("in");
    expect(breathAt(4.5).phase.id).toBe("vast");
    expect(breathAt(7).phase.id).toBe("uit");
    expect(breathAt(BREATH_CYCLE + 1)).toMatchObject({ round: 2 });
    expect(breathAt(4).scale).toBeCloseTo(1);
  });
});

describe("compliments", () => {
  it("has ids 1 to 24 like the database", () => {
    expect(COMPLIMENT_IDS).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
    expect(sql).toContain("compliment BETWEEN 1 AND 24");
    expect(COMPLIMENTS[3]!.text).toContain("sterker");
  });
});

describe("group challenge", () => {
  it("uses Monday weeks and the same goal as the database", () => {
    expect(mondayOf("2026-10-30")).toBe("2026-10-26");
    expect(mondayOf("2026-10-26")).toBe("2026-10-26");
    expect(challengeForWeek("2026-10-26")).toBe(challengeForWeek(mondayOf("2026-11-01")));
    expect(challengeForWeek("2026-10-26")).not.toBe(challengeForWeek("2026-11-02"));
    expect(sql).toContain(`< ${GROUP_CHALLENGE_GOAL} THEN RETURN 0`);
  });
});

describe("badges", () => {
  it("are earned from your own counts", () => {
    const zero: BadgeStats = {
      stories: 0,
      diary: 0,
      moods: 0,
      mood_streak: 0,
      games_won: 0,
      compliments_sent: 0,
      compliments_received: 0,
      challenges: 0,
      groups_made: 0,
      pet_xp: 0,
    };
    expect(earnedBadges(zero)).toEqual([]);
    expect(earnedBadges({ ...zero, moods: 7, mood_streak: 7 }).map((b) => b.id)).toEqual([
      "eerste-gevoel",
      "week-gevoel",
    ]);
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
  });
});
