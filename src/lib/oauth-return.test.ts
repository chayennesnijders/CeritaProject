import { describe, expect, it } from "vitest";
import { readOAuthReturn } from "./oauth-return";

describe("readOAuthReturn", () => {
  it("reads tokens from the hash (implicit flow)", () => {
    expect(
      readOAuthReturn(
        "https://app.ceritaproject.nl/auth#access_token=a&refresh_token=r&type=bearer",
      ),
    ).toEqual({
      kind: "tokens",
      accessToken: "a",
      refreshToken: "r",
    });
  });
  it("reads a one-time code from the query (PKCE flow)", () => {
    expect(readOAuthReturn("https://app.ceritaproject.nl/auth?code=xyz")).toEqual({
      kind: "code",
      code: "xyz",
    });
  });
  it("turns Supabase errors into a Dutch message", () => {
    const r = readOAuthReturn(
      "https://app.ceritaproject.nl/auth?error=server_error&error_description=Database+error+saving+new+user",
    );
    expect(r.kind).toBe("error");
    expect(r.kind === "error" && r.message).toMatch(/account kon niet worden aangemaakt/);
    expect(readOAuthReturn("https://app.ceritaproject.nl/auth#error=access_denied").kind).toBe(
      "error",
    );
  });
  it("is quiet on a normal visit", () => {
    expect(readOAuthReturn("https://app.ceritaproject.nl/auth").kind).toBe("none");
  });
});
