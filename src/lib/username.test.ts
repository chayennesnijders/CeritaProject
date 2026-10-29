import { describe, it, expect } from "vitest";
const valid = (u: string) => /^[a-z0-9_.]{3,20}$/.test(u);
describe("gebruikersnaam", () => {
  it("3 tot 20 tekens, letters/cijfers/_/.", () => {
    expect(valid("chay_2001")).toBe(true);
    expect(valid("ab")).toBe(false);
    expect(valid("met spatie")).toBe(false);
  });
});
