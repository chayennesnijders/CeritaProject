import { describe, expect, it } from "vitest";
import {
  ageBracket,
  assessSafety,
  buildContext,
  buddyMode,
  parseReply,
  titleFrom,
  visibleWhileStreaming,
} from "./ceritabuddy";

const noMod = { selfHarm: false, selfHarmIntent: false, violence: false, sexualMinors: false };

describe("parseReply", () => {
  it("turns a KEUZES line into buttons", () => {
    const r = parseReply("Wat komt het dichtst in de buurt?\n\nKEUZES: A. Ik ben vooral boos | B. Teleurgesteld | C) Verdrietig | Ik weet het niet");
    expect(r.text).toBe("Wat komt het dichtst in de buurt?");
    expect(r.choices).toEqual(["Ik ben vooral boos", "Teleurgesteld", "Verdrietig", "Ik weet het niet"]);
  });
  it("keeps only known app links", () => {
    const r = parseReply("Misschien helpt een rustmoment. [[app:rust]] [[app:hack]] [[app:verhalen]]");
    expect(r.links).toEqual(["rust", "verhalen"]);
    expect(r.text).toBe("Misschien helpt een rustmoment.");
  });
  it("notices the model's own safety mark", () => {
    const r = parseReply("[[veilig]]Ik ben blij dat je het vertelt.");
    expect(r.safety).toBe(true);
    expect(r.text).toBe("Ik ben blij dat je het vertelt.");
  });
  it("leaves a normal reply alone", () => {
    const r = parseReply("Haha, die serie is echt goed. Welke aflevering ben je?");
    expect(r).toEqual({ text: "Haha, die serie is echt goed. Welke aflevering ben je?", choices: [], links: [], safety: false });
  });
});

describe("visibleWhileStreaming", () => {
  it("hides a KEUZES line that is still coming in", () => {
    expect(visibleWhileStreaming("Wat voel je?\nKEUZES: boos | ver")).toBe("Wat voel je?");
    expect(visibleWhileStreaming("Wat voel je?\nKEU")).toBe("Wat voel je?");
  });
  it("hides markers, also half-written ones", () => {
    expect(visibleWhileStreaming("[[veilig]]Fijn dat je het zegt [[ap")).toBe("Fijn dat je het zegt ");
    expect(visibleWhileStreaming("Probeer dit [[app:rust]] eens")).toBe("Probeer dit  eens");
  });
});

describe("assessSafety", () => {
  it("is calm for ordinary chats", () => {
    expect(assessSafety("Mijn vriendin reageert niet en ik baal ervan", noMod)).toBe("none");
    expect(assessSafety("Mijn oma heeft kanker, ik ben zo verdrietig", noMod)).toBe("none");
  });
  it("follows the safety protocol for suicide, self-harm and abuse", () => {
    expect(assessSafety("ik wil er niet meer zijn", noMod)).toBe("zorg");
    expect(assessSafety("ik heb mezelf weer gesneden", noMod)).toBe("zorg");
    expect(assessSafety("mijn stiefvader slaat me als hij gedronken heeft", noMod)).toBe("zorg");
    expect(assessSafety("ik durf niet meer naar huis", noMod)).toBe("zorg");
  });
  it("points to 112 when there is acute danger", () => {
    expect(assessSafety("ik heb net een hele strip pillen geslikt", noMod)).toBe("acuut");
    expect(assessSafety("ik sta nu op de brug", noMod)).toBe("acuut");
  });
  it("does not depend on the word list alone", () => {
    const msg = "het heeft allemaal geen zin meer, morgen ben ik weg";
    expect(assessSafety(msg, noMod)).toBe("none");
    expect(assessSafety(msg, { ...noMod, selfHarm: true })).toBe("zorg");
    expect(assessSafety(msg, { ...noMod, selfHarmIntent: true })).toBe("acuut");
  });
});

describe("ageBracket", () => {
  const now = new Date("2026-11-06T12:00:00Z");
  it("gives the bracket, not the age", () => {
    expect(ageBracket("2012-01-01", now)).toBe("13-15");
    expect(ageBracket("2010-11-07", now)).toBe("13-15"); // turns 16 tomorrow
    expect(ageBracket("2010-11-06", now)).toBe("16-18");
    expect(ageBracket("2005-05-05", now)).toBe("19-22");
    expect(ageBracket("2000-01-01", now)).toBe("23-27");
    expect(ageBracket(null, now)).toBeNull();
  });
});

describe("buildContext", () => {
  it("sends only the newest turns, starting with the young person", () => {
    const h = Array.from({ length: 30 }, (_, i) => ({ role: (i % 2 ? "assistant" : "user") as "user" | "assistant", content: `b${i}` }));
    const c = buildContext(h, 5);
    expect(c[0]!.role).toBe("user");
    expect(c.length).toBeLessThanOrEqual(5);
    expect(c.at(-1)!.content).toBe("b29");
  });
  it("trims very long messages", () => {
    const c = buildContext([{ role: "user", content: "x".repeat(5000) }], 4, 100);
    expect(c[0]!.content.length).toBe(101);
  });
});

describe("small helpers", () => {
  it("makes a short title", () => {
    expect(titleFrom("  hoi\n\nik wil iets vertellen ")).toBe("hoi ik wil iets vertellen");
    expect(titleFrom("a".repeat(100)).length).toBe(40);
    expect(titleFrom("")).toBe("Nieuw gesprek");
  });
  it("finds modes by id", () => {
    expect(buddyMode("relativeren")?.label).toBe("Help me relativeren");
    expect(buddyMode("bestaat-niet")).toBeNull();
  });
});
