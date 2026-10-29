import { describe, expect, it } from "vitest";
import post from "@/test/fixtures/wp-post-480.json";
import {
  decodeEntities,
  fillPhotos,
  htmlToStory,
  photoExt,
  wpPostToArticle,
  type WpPost,
} from "./wordpress";

describe("WordPress import", () => {
  const a = wpPostToArticle(post as WpPost);

  it("keeps the story text, line breaks and quotes exactly", () => {
    const paragraphs = a.body.split("\n\n");
    expect(paragraphs[0]).toBe("Anoniem, 18 jaar");
    expect(paragraphs[1]).toBe(
      "Ik vind het moeilijk om hierover te praten.\nDaarom wil ik graag anoniem blijven.",
    );
    expect(paragraphs).toContain("‘Ik begrijp je’");
    expect(paragraphs).toContain(
      "Misschien praat ik te veel.\nMisschien ben ik te intens.\nMisschien ben ik vermoeiend.",
    );
    expect(paragraphs.at(-1)).toBe("Als jij jezelf hierin herkent:\nje bent niet alleen. 🤍");
  });

  it("turns photos between the text into placeholders, using the original file", () => {
    expect(a.images).toEqual([
      "https://i0.wp.com/ceritaproject.wpcomstaging.com/wp-content/uploads/2026/06/img_5305-edited.jpg?fit=433%2C433&ssl=1",
      "https://i0.wp.com/ceritaproject.wpcomstaging.com/wp-content/uploads/2025/10/img_5286.jpg?resize=960%2C960&ssl=1",
    ]);
    expect(a.body).toContain("[[foto:0]]");
    expect(a.body).toContain("[[foto:1]]");
  });

  it("keeps list items and decodes entities", () => {
    expect(a.body).toContain("• Eerste punt & meer");
    expect(decodeEntities("trauma&#8217;s &#x1F90D; &hellip;")).toBe("trauma’s 🤍 …");
  });

  it("picks the cover, category, title and date", () => {
    expect(a.wp_id).toBe(480);
    expect(a.title).toBe("Ik blijf mezelf uitleggen tot iemand mij begrijpt");
    expect(a.cover).toBe(
      "https://ceritaproject.wpcomstaging.com/wp-content/uploads/2026/06/cover.jpg",
    );
    expect(a.category).toBe("in-je-hoofd");
    expect(a.created_at).toBe(new Date("2026-06-10T19:00:00").toISOString());
    expect(
      wpPostToArticle({ ...(post as WpPost), date_gmt: "2026-06-10T17:00:00" }).created_at,
    ).toBe("2026-06-10T17:00:00.000Z");
  });

  it("fills in stored photo paths and drops photos that could not be copied", () => {
    expect(fillPhotos("a\n\n[[foto:0]]\n\nb\n\n[[foto:1]]\n\nc", ["wordpress/480/0.jpg"])).toBe(
      "a\n\n[[foto:wordpress/480/0.jpg]]\n\nb\n\nc",
    );
    expect(photoExt("https://x/y/img.PNG?fit=1")).toBe("png");
    expect(photoExt("https://x/y/img")).toBe("jpg");
  });

  it("ignores empty paragraphs", () => {
    expect(htmlToStory("<p> </p><p>Hoi</p>").body).toBe("Hoi");
  });
});
