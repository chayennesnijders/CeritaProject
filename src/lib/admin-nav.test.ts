import { describe, expect, it } from "vitest";
import { ADMIN_GROUPS, ADMIN_PAGES, visibleGroups } from "./admin-nav";
import { canSeeAdminTab } from "./staff";

describe("admin navigation", () => {
  it("puts every page (except Start) in exactly one group", () => {
    const grouped = ADMIN_GROUPS.flatMap((g) => g.pages);
    const pages = Object.keys(ADMIN_PAGES).filter((p) => p !== "start");
    expect([...grouped].sort()).toEqual([...pages].sort());
    expect(new Set(grouped).size).toBe(grouped.length);
  });
  it("shows a moderator only the moderation pages", () => {
    const mod = { isAdmin: false, isOwner: false, isModerator: true };
    const groups = visibleGroups((p) => canSeeAdminTab(p, mod));
    expect(groups.map((g) => g.title)).toEqual(["Moderatie"]);
    expect(groups[0]!.pages).toEqual(["inbox", "berichten"]);
  });
  it("hides Team from admins who are not the owner", () => {
    const admin = { isAdmin: true, isOwner: false, isModerator: false };
    const all = visibleGroups((p) => canSeeAdminTab(p, admin)).flatMap((g) => g.pages);
    expect(all).not.toContain("team");
    expect(all).toContain("logboek");
  });
});
