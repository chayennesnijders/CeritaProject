import { describe, expect, it } from "vitest";
import { ARTICLE_CATEGORIES, categoryLabel, excerpt } from "@/lib/articles";

describe("artikel categorieën", () => {
  it("kent de vijf onderwerpen van de WordPress-site", () =>
    expect(ARTICLE_CATEGORIES).toEqual(["in-je-hoofd", "overkomen", "relaties", "jong-zijn", "leven-daarna"]));
  it("vertaalt categorieën naar Nederlandse labels", () => {
    expect(categoryLabel("familie")).toBe("Familie");
    expect(categoryLabel("vriendschap")).toBe("Vriendschap");
    expect(categoryLabel("inspiratie")).toBe("Inspiratie");
    expect(categoryLabel("in-je-hoofd")).toBe("In je hoofd");
    expect(categoryLabel("iets anders")).toBe("Verhalen");
  });
});

describe("excerpt", () => {
  it("kapt lange teksten af op 110 tekens", () => {
    const lang = "a".repeat(200);
    expect(excerpt(lang).length).toBe(111);
  });
  it("gebruikt alleen de eerste alinea", () => {
    expect(excerpt("eerste\n\ntweede")).toBe("eerste");
  });
  it("slaat foto's en korte regels over", () => {
    const body = "Anoniem, 18 jaar\n\n[[foto:wordpress/1/0.jpg]]\n\nIk vind het moeilijk om hierover te praten,\nmaar ik doe het toch.";
    expect(excerpt(body)).toBe("Ik vind het moeilijk om hierover te praten, maar ik doe het toch.");
  });
});
