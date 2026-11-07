import { describe, expect, it } from "vitest";
import { friendlyAuthError, passwordProgress } from "./auth-messages";

describe("auth messages", () => {
  it("explains the usual errors in Dutch", () => {
    expect(friendlyAuthError("Invalid login credentials")).toContain("klopt niet");
    expect(friendlyAuthError("Email not confirmed")).toContain("nog niet bevestigd");
    expect(friendlyAuthError("For security purposes, you can only request this after 30 seconds."))
      .toContain("Even wachten");
    expect(friendlyAuthError("TypeError: Failed to fetch")).toContain("Geen verbinding");
    expect(friendlyAuthError("Iets onbekends")).toBe("Iets onbekends");
  });
  it("shows how far a new password is", () => {
    expect(passwordProgress("")).toEqual({ pct: 0, left: 8, ok: false });
    expect(passwordProgress("abcd")).toEqual({ pct: 50, left: 4, ok: false });
    expect(passwordProgress("abcdefghij")).toEqual({ pct: 100, left: 0, ok: true });
  });
});
