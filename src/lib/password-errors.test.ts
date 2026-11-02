import { describe, expect, it } from "vitest";
import { newPasswordError } from "./password-errors";

describe("newPasswordError", () => {
  it("explains the most common reasons", () => {
    expect(newPasswordError({ code: "same_password" })).toContain("oude wachtwoord");
    expect(
      newPasswordError({ message: "New password should be different from the old password." }),
    ).toContain("oude wachtwoord");
    expect(newPasswordError({ code: "weak_password" })).toContain("te zwak");
    expect(newPasswordError({ message: "Auth session missing!" })).toContain("verlopen");
    expect(newPasswordError({ message: "boom" })).toContain("Vraag opnieuw");
  });
});
