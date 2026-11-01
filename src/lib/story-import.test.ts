import { describe, expect, it } from "vitest";
import { guessCategory, parseStories } from "./story-import";

const notes = `Mijn eerste dag op de nieuwe school
Ik was zo zenuwachtig. Iedereen leek elkaar al te kennen en ik stond alleen bij het hek.

Na een week durfde ik iemand aan te spreken.
---
Titel: Toen mijn opa overleed
Leeftijd: 16+
Categorie: Het leven daarna
Het was een gewone dinsdag toen mijn moeder belde. Ik weet nog precies waar ik stond.
***

   Te kort
---
Angst in mijn hoofd
Elke avond lag ik wakker van de paniek. Angst was mijn vaste gast, mijn onzeker hoofd stond nooit stil.`;

describe("parseStories", () => {
  const s = parseStories(notes);
  it("splits on ---/*** lines, takes the first line as title and skips too-short pieces", () => {
    expect(s.map((x) => x.title)).toEqual([
      "Mijn eerste dag op de nieuwe school",
      "Toen mijn opa overleed",
      "Angst in mijn hoofd",
    ]);
    expect(s[0]!.body).toMatch(/^Ik was zo zenuwachtig/);
    expect(s[0]!.body).toContain("\n\nNa een week");
  });
  it("reads optional age and category lines and leaves them out of the text", () => {
    expect(s[1]!.minAge).toBe(16);
    expect(s[1]!.category).toBe("leven-daarna");
    expect(s[1]!.body).not.toMatch(/Leeftijd|Categorie/);
    expect(s[0]!.minAge).toBe(12);
  });
  it("guesses a category from the words", () => {
    expect(s[2]!.category).toBe("in-je-hoofd");
    expect(guessCategory("mijn ouders en mijn vriend")).toBe("relaties");
  });
});
