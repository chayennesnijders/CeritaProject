import { describe, expect, it } from "vitest";
import { bankPhotos, duplicatesToRemove, isDuplicate, referencedPaths } from "./photo-bank";

const A = "ffff0000ffff0000";
const A2 = "ffff0000ffff0001"; // same photo, other file
const B = "0000ffff0000ffff";

describe("photo bank", () => {
  const stories = [
    { image_url: "verhalen/live.jpg", body: "Tekst\n\n[[foto:oud/tussen.jpg]]", is_published: true },
    { image_url: "verhalen/verborgen.jpg", body: "", is_published: false },
    { image_url: "https://extern.nl/x.jpg", body: "", is_published: true },
  ];
  it("knows which files stories point to", () => {
    expect([...referencedPaths(stories)].sort()).toEqual(
      ["https://extern.nl/x.jpg", "oud/tussen.jpg", "verhalen/live.jpg", "verhalen/verborgen.jpg"].sort(),
    );
  });
  it("merges bank rows with story photos, free photos first", () => {
    const list = bankPhotos([{ path: "fotobank/nieuw.jpg", hash: A, created_at: "2026-11-01" }], stories);
    expect(list.map((p) => p.path)).toEqual(["fotobank/nieuw.jpg", "oud/tussen.jpg", "verhalen/verborgen.jpg", "verhalen/live.jpg"]);
    expect(list.find((p) => p.path === "verhalen/live.jpg")!.inUse).toBe(true);
    expect(list.find((p) => p.path === "fotobank/nieuw.jpg")!.referenced).toBe(false);
    expect(list.some((p) => p.path.startsWith("http"))).toBe(false);
  });
  it("leaves hidden copies out, also when a story still points to them", () => {
    const list = bankPhotos([{ path: "verhalen/verborgen.jpg", hash: A, created_at: "", hidden: true }], stories);
    expect(list.map((p) => p.path)).not.toContain("verhalen/verborgen.jpg");
  });
  it("spots a duplicate of a known photo", () => {
    expect(isDuplicate(A2, [null, A])).toBe(true);
    expect(isDuplicate(B, [A, null])).toBe(false);
  });
  it("keeps the photo in use and only deletes unused files", () => {
    const photos = [
      { path: "fotobank/kopie.jpg", hash: A2, created_at: "2026-10-01", inUse: false, referenced: false },
      { path: "verhalen/live.jpg", hash: A, created_at: "2026-11-01", inUse: true, referenced: true },
      { path: "verhalen/verborgen.jpg", hash: A, created_at: "2026-09-01", inUse: false, referenced: true },
      { path: "fotobank/anders.jpg", hash: B, created_at: "2026-10-01", inUse: false, referenced: false },
      { path: "fotobank/nog-geen-hash.jpg", hash: null, created_at: "2026-10-01", inUse: false, referenced: false },
    ];
    expect(duplicatesToRemove(photos)).toEqual([
      { path: "verhalen/verborgen.jpg", deleteFile: false },
      { path: "fotobank/kopie.jpg", deleteFile: true },
    ]);
  });
});
