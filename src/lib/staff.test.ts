import { describe, expect, it } from "vitest";
import { canSeeAdminTab, seesPublicMessages } from "./staff";

const owner = { isAdmin: true, isOwner: true, isModerator: false };
const admin = { isAdmin: true, isOwner: false, isModerator: false };
const mod = { isAdmin: false, isOwner: false, isModerator: true };
const member = { isAdmin: false, isOwner: false, isModerator: false };

describe("staff tabs", () => {
  it("moderators only see Inbox and Berichten", () => {
    expect(canSeeAdminTab("inbox", mod)).toBe(true);
    expect(canSeeAdminTab("berichten", mod)).toBe(true);
    for (const t of ["nieuws", "overzicht", "impact", "logboek", "groepen", "team"])
      expect(canSeeAdminTab(t, mod)).toBe(false);
    expect(seesPublicMessages(mod)).toBe(false);
  });
  it("admins see everything except Team, the owner sees Team too", () => {
    expect(canSeeAdminTab("overzicht", admin)).toBe(true);
    expect(canSeeAdminTab("team", admin)).toBe(false);
    expect(canSeeAdminTab("team", owner)).toBe(true);
    expect(seesPublicMessages(admin)).toBe(true);
  });
  it("members see nothing", () => {
    expect(canSeeAdminTab("inbox", member)).toBe(false);
  });
});
