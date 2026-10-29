import { describe, it, expect } from "vitest";
import { tierPrice, pointsFor, settlement, shopInfo, SHIPPING_TIME } from "./shop";

describe("Game Clicks prijzen", () => {
  it("minimum: 3,60 + 4,50 verzending = 8,10", () => expect(tierPrice("min").totalCents).toBe(810));
  it("cadeau: 2 x 3,60 + 2 x 4,50 = 16,20", () => expect(tierPrice("gift").totalCents).toBe(1620));
  it("midden ligt ertussen: 12,15", () => expect(tierPrice("mid").totalCents).toBe(1215));
  it("1 punt per hele euro", () => expect(pointsFor(1215)).toBe(12));
  it("minimum houdt 1 euro winst over", () => expect(settlement({ kind: "paid", amount_cents: 810, tier: "min" }).profit).toBe(100));
  it("cadeau houdt 2 euro winst over", () => expect(settlement({ kind: "paid", amount_cents: 1620, tier: "gift" }).profit).toBe(200));
});

describe("Shop-uitleg bij elk product", () => {
  it("fysiek: DHL binnen 1-2 werkdagen", () => {
    expect(SHIPPING_TIME).toBe("1-2 werkdagen");
    expect(shopInfo("fysiek").find((i) => i.title === "Verzending")?.text).toContain("1-2 werkdagen");
  });
  it("digitaal: pdf meteen, geen verzending", () => {
    const t = shopInfo("digitaal").find((i) => i.title === "Verzending")?.text ?? "";
    expect(t).toContain("pdf");
    expect(t).not.toContain("DHL");
  });
  it("kapot of verkeerd: foto en beschrijving, geld terug", () => {
    const t = shopInfo("fysiek").find((i) => i.title === "Kapot of verkeerd?")?.text ?? "";
    expect(t).toContain("foto");
    expect(t).toContain("beschrijving");
    expect(t).toContain("geld terug");
  });
  it("betaal wat je voelt staat bij elk product bovenaan", () => {
    expect(shopInfo("fysiek")[0]?.title).toBe("Betaal wat je voelt");
    expect(shopInfo("digitaal")[0]?.title).toBe("Betaal wat je voelt");
  });
});
