import { describe, expect, it } from "vitest";
import { outsidePhotos, photoExtension, photoSources, swapPhotos } from "./outside-photos";

const wp =
  "https://i0.wp.com/ceritaproject.wpcomstaging.com/wp-content/uploads/2025/10/img_5286.jpg?resize=960%2C960&ssl=1";
const article = {
  id: "a1",
  title: "Verhaal",
  image_url: "https://ceritaproject.wpcomstaging.com/wp-content/uploads/cover.png",
  body: `Hoi\n\n[[foto:${wp}]]\n\nDoei\n\n[[foto:wordpress/480/0.jpg]]\n\n[[foto:${wp}]]`,
};

describe("outside photos", () => {
  it("finds cover and photos that are still web addresses, once each", () => {
    expect(outsidePhotos(article)).toEqual([article.image_url, wp]);
    expect(
      outsidePhotos({ ...article, image_url: "wordpress/1/cover.jpg", body: "[[foto:x/y.jpg]]" }),
    ).toEqual([]);
  });
  it("swaps the addresses for stored paths and leaves the rest alone", () => {
    const r = swapPhotos(article, {
      [wp]: "wordpress/a1/1.jpg",
      [article.image_url]: "wordpress/a1/0.png",
    });
    expect(r.image_url).toBe("wordpress/a1/0.png");
    expect(r.body).toBe(
      "Hoi\n\n[[foto:wordpress/a1/1.jpg]]\n\nDoei\n\n[[foto:wordpress/480/0.jpg]]\n\n[[foto:wordpress/a1/1.jpg]]",
    );
  });
  it("keeps a photo address when copying it failed", () => {
    expect(swapPhotos(article, {}).body).toBe(article.body);
  });
  it("picks a sensible extension and also tries the original WordPress file", () => {
    expect(photoExtension(wp)).toBe("jpg");
    expect(photoExtension("https://x/y", "image/webp")).toBe("webp");
    expect(photoSources(wp)[1]).toBe(
      "https://ceritaproject.wpcomstaging.com/wp-content/uploads/2025/10/img_5286.jpg",
    );
  });
});
