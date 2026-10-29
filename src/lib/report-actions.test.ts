import { describe, expect, it } from "vitest";
import { reportActionSchema } from "./report-actions";
const reportId = "11111111-1111-4111-8111-111111111111";
describe("meldingen afhandelen", () => {
  it("een antwoord vereist tekst", () => {
    expect(reportActionSchema.safeParse({ reportId, action: "answer", response: "  " }).success).toBe(false);
    expect(reportActionSchema.parse({ reportId, action: "answer", response: " We kijken ernaar. " }).response).toBe("We kijken ernaar.");
  });
  it("afkeuren kan zonder persoonlijk antwoord", () => {
    expect(reportActionSchema.safeParse({ reportId, action: "reject", response: "" }).success).toBe(true);
  });
});