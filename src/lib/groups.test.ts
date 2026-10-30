import { describe, expect, it } from "vitest";
import { groupFormError, otherBandGroups, visibleGroups } from "./groups";

// De groepen zoals ze nu in de database staan.
const GROUPS = [
  { name: "Creatief hoekje", age_group: "junior" },
  { name: "Schoolstress", age_group: "junior" },
  { name: "Vriendschap", age_group: "junior" },
  { name: "Eerste baan", age_group: "senior" },
  { name: "Mentale gezondheid", age_group: "senior" },
  { name: "Schrijversclub", age_group: "senior" },
  { name: "Op jezelf wonen", age_group: "adult" },
  { name: "Werk & studie", age_group: "adult" },
];

const names = (rows: { name: string }[]) => rows.map((r) => r.name).sort();

describe("visibleGroups", () => {
  it("een 16-25 lid ziet alleen de senior-groepen", () => {
    expect(names(visibleGroups(GROUPS, { ageGroup: "senior" }))).toEqual([
      "Eerste baan",
      "Mentale gezondheid",
      "Schrijversclub",
    ]);
  });

  it("een 12-15 lid ziet alleen de junior-groepen", () => {
    expect(names(visibleGroups(GROUPS, { ageGroup: "junior" }))).toEqual([
      "Creatief hoekje",
      "Schoolstress",
      "Vriendschap",
    ]);
  });

  it("een 26-27 lid ziet alleen de adult-groepen", () => {
    expect(names(visibleGroups(GROUPS, { ageGroup: "adult" }))).toEqual(["Op jezelf wonen", "Werk & studie"]);
  });

  it("zonder geboortedatum is er niets te zien", () => {
    expect(visibleGroups(GROUPS, {})).toEqual([]);
    expect(visibleGroups(GROUPS, { ageGroup: null })).toEqual([]);
  });

  it("een beheerder ziet standaard ook alleen de eigen leeftijdsgroep", () => {
    expect(names(visibleGroups(GROUPS, { ageGroup: "senior", isAdmin: true }))).toHaveLength(3);
  });

  it("een beheerder die het expliciet kiest, ziet alle groepen", () => {
    expect(visibleGroups(GROUPS, { ageGroup: "senior", isAdmin: true, showAll: true })).toHaveLength(8);
  });

  it("een gewoon lid kan met showAll niet naar andere groepen", () => {
    expect(visibleGroups(GROUPS, { ageGroup: "senior", isAdmin: false, showAll: true })).toHaveLength(3);
  });
});

describe("otherBandGroups", () => {
  it("toont de groepen die buiten de eigen band vallen", () => {
    expect(otherBandGroups(GROUPS, { ageGroup: "senior" })).toHaveLength(5);
  });

  it("zijn alle groepen 'anders' zonder geboortedatum", () => {
    expect(otherBandGroups(GROUPS, {})).toHaveLength(8);
  });
});

import { groupsByBand, parseMentions, splitMentions } from "./groups";
describe("groupsByBand", () => {
  it("zet bands in vaste volgorde en laat lege bands weg", () => {
    const rows = [{ name: "Op jezelf wonen", age_group: "adult" }, { name: "Schoolstress", age_group: "junior" }];
    expect(groupsByBand(rows).map((x) => x.band)).toEqual(["junior", "adult"]);
    expect(groupsByBand(GROUPS).map((x) => `${x.band}:${x.groups.length}`)).toEqual(["junior:3", "senior:3", "adult:2"]);
  });
});

const MEMBERS = [
  { user_id: "u1", display_name: "Chayenne", username: "chay" },
  { user_id: "u2", display_name: "Xai Rich", username: "xaidrich" },
  { user_id: "u3", display_name: "Noekie", username: null },
];

describe("parseMentions", () => {
  it("herkent een gebruikersnaam met @", () => {
    expect(parseMentions("hoi @chay hoe is het?", MEMBERS)).toEqual(["u1"]);
  });

  it("herkent een naam met spaties als die aan elkaar wordt getypt", () => {
    expect(parseMentions("@XaiRich kom je?", MEMBERS)).toEqual(["u2"]);
  });

  it("werkt ook op naam zonder gebruikersnaam", () => {
    expect(parseMentions("@noekie!", MEMBERS)).toEqual(["u3"]);
  });

  it("negeert onbekende namen en telt dubbeles maar een keer", () => {
    expect(parseMentions("@chay @chay @niemand", MEMBERS)).toEqual(["u1"]);
  });
});

describe("splitMentions", () => {
  it("splitst tekst en vermeldingen", () => {
    expect(splitMentions("hoi @chay!")).toEqual([
      { text: "hoi ", mention: false },
      { text: "@chay", mention: true },
      { text: "!", mention: false },
    ]);
  });
});

describe("eigen groep maken", () => {
  it("checks the name and description like the database does", () => {
    expect(groupFormError("ab", "")).toContain("minstens 3");
    expect(groupFormError("x".repeat(41), "")).toContain("maximaal 40");
    expect(groupFormError("Gamers", "y".repeat(141))).toContain("140");
    expect(groupFormError("  Gamers  ", "Samen gamen")).toBeNull();
  });
});
