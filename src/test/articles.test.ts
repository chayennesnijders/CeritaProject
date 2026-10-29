import { describe, expect, it } from "vitest";
import { ARTICLE_CATEGORIES, categoryLabel, excerpt } from "@/lib/articles";

describe("artikel categorieën", () => {
  it("kent alleen familie, vriendschap en inspiratie", () =>
    expect(ARTICLE_CATEGORIES).toEqual(["familie", "vriendschap", "inspiratie"]));
  it("vertaalt categorieën naar Nederlandse labels", () => {
    expect(categoryLabel("familie")).toBe("Familie");
    expect(categoryLabel("vriendschap")).toBe("Vriendschap");
    expect(categoryLabel("inspiratie")).toBe("Inspiratie");
    expect(categoryLabel("iets anders")).toBe("Familie");
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
});
