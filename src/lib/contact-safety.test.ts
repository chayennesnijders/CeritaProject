import { describe, expect, it } from "vitest";
import { CONTACT_PATTERN, contactRisks } from "./contact-safety";

describe("contactRisks", () => {
  it("notices phone numbers and other apps", () => {
    expect(contactRisks("bel me op 0612345678")).toContain("nummer");
    expect(contactRisks("mijn nummer is 06-12345678")).toContain("nummer");
    expect(contactRisks("wat is je nummer?")).toContain("nummer");
    expect(contactRisks("add me op snap")).toContain("app");
    expect(contactRisks("wat is je snapchat")).toContain("app");
    expect(contactRisks("zullen we liever verder praten op whatsapp")).toContain("app");
  });
  it("notices photos, meetings and secrets", () => {
    expect(contactRisks("stuur eens een foto van jezelf")).toContain("foto");
    expect(contactRisks("stuur nudes")).toContain("foto");
    expect(contactRisks("waar woon je eigenlijk?")).toContain("afspreken");
    expect(contactRisks("zullen we een keer afspreken")).toContain("afspreken");
    expect(contactRisks("niet tegen je ouders zeggen hoor")).toContain("geheim");
    expect(contactRisks("dit is ons geheimpje")).toContain("geheim");
    expect(contactRisks("hoe oud ben je echt?")).toContain("geheim");
  });
  it("stays quiet in ordinary chats", () => {
    expect(contactRisks("ik heb een foto gemaakt van mijn kat, zo schattig")).toEqual([]);
    expect(contactRisks("mijn moeder appte me net")).toEqual([]);
    expect(contactRisks("ik zat vandaag op school te huilen")).toEqual([]);
    expect(contactRisks("we gaan morgen met de klas naar het museum")).toEqual([]);
    expect(contactRisks("ik heb 6 euro gekregen")).toEqual([]);
  });
  it("builds one pattern for the database", () => {
    expect(new RegExp(CONTACT_PATTERN, "i").test("add me op insta")).toBe(true);
    expect(CONTACT_PATTERN).not.toContain("\\b");
  });
});
