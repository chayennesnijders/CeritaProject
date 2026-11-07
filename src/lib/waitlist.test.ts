import { describe, expect, it } from "vitest";
import { WAITLIST_PERKS, countBySource, waitlistProblem, type WaitlistForm } from "./waitlist";

const ok: WaitlistForm = {
  email: "noor@example.nl",
  age: 17,
  store: "play",
  parentOk: false,
  privacyOk: true,
};

describe("waitlist", () => {
  it("is ready when everything is filled in", () => {
    expect(waitlistProblem(ok)).toBeNull();
  });
  it("keeps under-13s out and asks under-16s for a parent's okay", () => {
    expect(waitlistProblem({ ...ok, age: 12 })).toMatch(/vanaf 13/);
    expect(waitlistProblem({ ...ok, age: 14 })).toMatch(/ouder/);
    expect(waitlistProblem({ ...ok, age: 14, parentOk: true })).toBeNull();
  });
  it("asks for what is missing", () => {
    expect(waitlistProblem({ ...ok, email: "noor@" })).toMatch(/e-mailadres/);
    expect(waitlistProblem({ ...ok, age: null })).toMatch(/oud/);
    expect(waitlistProblem({ ...ok, store: null })).toMatch(/telefoon/);
    expect(waitlistProblem({ ...ok, privacyOk: false })).toMatch(/mail/);
  });
});

describe("waitlist for parents", () => {
  it("needs no age or parent's okay, but still e-mail, phone and consent", () => {
    const parent: WaitlistForm = { ...ok, kind: "ouder", age: null };
    expect(waitlistProblem(parent)).toBeNull();
    expect(waitlistProblem({ ...parent, store: null })).toMatch(/telefoon/);
    expect(waitlistProblem({ ...parent, privacyOk: false })).toMatch(/mail/);
    expect(waitlistProblem({ ...parent, email: "x" })).toMatch(/e-mailadres/);
  });
  it("tells parents plainly they see nothing of young people", () => {
    expect(WAITLIST_PERKS.ouder.some((p) => /niets van hen/.test(p.text))).toBe(true);
  });
});

describe("waitlist sources", () => {
  it("counts sign-ups per source, biggest first, with friendly names", () => {
    const r = countBySource([
      { source: "tiktok" },
      { source: "TikTok" },
      { source: "vriend" },
      { source: null },
      { source: "school-x" },
      { source: "tiktok" },
    ]);
    expect(r[0]).toEqual({ source: "tiktok", label: "🎵 TikTok (bio)", count: 3 });
    expect(r.map((x) => x.label)).toContain("🔗 Zonder bron (link zonder ?bron=)");
    expect(r.map((x) => x.label)).toContain("📍 school-x");
  });
});
