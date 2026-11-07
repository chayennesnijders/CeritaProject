import { describe, expect, it } from "vitest";
import { confirmError, confirmKind, readConfirmLink } from "./confirm-link";

describe("confirm links from emails", () => {
  it("reads the code and type from the link", () => {
    expect(readConfirmLink("?token_hash=abc&type=recovery")).toEqual({ tokenHash: "abc", type: "recovery" });
    expect(readConfirmLink("?token_hash=abc&type=raar")).toBeNull();
    expect(readConfirmLink("?type=signup")).toBeNull();
  });
  it("sends a password reset on to the new-password page", () => {
    expect(confirmKind("recovery").next).toBe("/reset-password");
    expect(confirmKind("signup").next).toBe("/home");
  });
  it("explains a used or expired link", () => {
    expect(confirmError("Email link is invalid or has expired", "recovery")).toContain("nieuwe aan");
    expect(confirmError("Token has expired or is invalid", "signup")).toContain("bevestigingsmail");
  });
});
