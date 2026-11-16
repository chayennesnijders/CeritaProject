import { describe, expect, it } from "vitest";
import { flyerLink, HALL_OF_FAME_MIN, qrMatrix, qrPath, isSubmissionUrl, LEVELS, levelFor, nextLevel, referralLink, totalPoints } from "./ambassador";

describe("ambassador", () => {
  it("counts sign-ups plus approved task points", () => {
    expect(totalPoints(4, 7)).toBe(11);
    expect(totalPoints(-2, 3)).toBe(3);
  });

  it("finds the level reached", () => {
    expect(levelFor(0)).toBeNull();
    expect(levelFor(9)).toBeNull();
    expect(levelFor(10)?.id).toBe("starter");
    expect(levelFor(59)?.id).toBe("creator");
    expect(levelFor(250)?.id).toBe("legend");
  });

  it("levels go up in points", () => {
    for (let i = 1; i < LEVELS.length; i++) expect(LEVELS[i]!.min).toBeGreaterThan(LEVELS[i - 1]!.min);
  });

  it("says what is missing for the next level", () => {
    expect(nextLevel(0)).toMatchObject({ missing: 10, progress: 0 });
    expect(nextLevel(20)).toMatchObject({ missing: 10, progress: 0.5 });
    expect(nextLevel(100)).toBeNull();
  });

  it("Hall of Fame is for Legends", () => {
    expect(HALL_OF_FAME_MIN).toBe(100);
    expect(levelFor(HALL_OF_FAME_MIN)?.id).toBe("legend");
  });

  it("builds the personal waitlist link", () => {
    expect(referralLink("sanne2")).toBe("https://app.ceritaproject.nl/wachtlijst?bron=amb-sanne2");
    expect(("amb-" + "a".repeat(20)).length).toBeLessThanOrEqual(40);
  });

  it("only accepts public https links", () => {
    expect(isSubmissionUrl("https://www.tiktok.com/@x/video/1")).toBe(true);
    expect(isSubmissionUrl("http://tiktok.com/x")).toBe(false);
    expect(isSubmissionUrl("javascript:alert(1)")).toBe(false);
    expect(isSubmissionUrl("https://localhost")).toBe(false);
  });

  it("flyer link is personal, or general for the team", () => {
    expect(flyerLink("noor")).toBe("https://app.ceritaproject.nl/wachtlijst?bron=amb-noor");
    expect(flyerLink(null)).toBe("https://app.ceritaproject.nl/wachtlijst?bron=flyer");
    expect(flyerLink("Noor<script>")).toBe("https://app.ceritaproject.nl/wachtlijst?bron=flyer");
  });

  it("makes a square QR code with finder patterns", () => {
    const m = qrMatrix(flyerLink("noor"));
    expect(m.length).toBeGreaterThanOrEqual(21);
    expect(m.every((row) => row.length === m.length)).toBe(true);
    // top-left finder pattern: dark corner, dark edge
    expect(m[0]![0]).toBe(true);
    expect(m[0]![6]).toBe(true);
    expect(qrPath(m)).toContain("M2 2h1v1h-1z");
  });
});
