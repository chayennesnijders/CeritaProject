import { describe, expect, it } from "vitest";
import { nameWithUsername, normalizeUsername, usernameProblem } from "./username";

describe("username", () => {
  it("normalizes what people type", () => {
    expect(normalizeUsername("  @Chayenne ")).toBe("chayenne");
    expect(normalizeUsername("Anouk van Dijk!")).toBe("anoukvandijk");
    expect(normalizeUsername("mimi_2.0")).toBe("mimi_2.0");
  });
  it("explains what is wrong", () => {
    expect(usernameProblem("")).toMatch(/Vul/);
    expect(usernameProblem("ab")).toMatch(/minstens 3/);
    expect(usernameProblem("a".repeat(21))).toMatch(/3 tot 20/);
    expect(usernameProblem("anouk")).toBeNull();
    expect(usernameProblem("chay_2001")).toBeNull();
    expect(usernameProblem("met spatie")).not.toBeNull();
  });
  it("shows name and username together for admins", () => {
    expect(nameWithUsername("Anouk", "anouk")).toBe("Anouk (@anouk)");
    expect(nameWithUsername("Anouk", null)).toBe("Anouk");
    expect(nameWithUsername(null, null)).toBe("Lid");
  });
});
