export const SHELF = [
  { id: "wil-lezen", emoji: "🔖", label: "Wil ik lezen" },
  { id: "aan-het-lezen", emoji: "📖", label: "Aan het lezen" },
  { id: "gelezen", emoji: "✅", label: "Gelezen" },
] as const;
export type ShelfStatus = (typeof SHELF)[number]["id"];

/** Cover picture from Open Library when the book has an ISBN. */
export const coverUrl = (isbn: string | null | undefined) =>
  isbn && /^[0-9]{10}([0-9]{3})?$/.test(isbn)
    ? `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`
    : null;

/** A soft colour per book for the cover when there is no picture. */
const SPINES = ["#f7c6d0", "#c9e4de", "#fde2b3", "#d4d1f5", "#bfe3f5", "#f5d0c5"];
export const spineColor = (title: string) =>
  SPINES[[...title].reduce((a, c) => a + c.charCodeAt(0), 0) % SPINES.length]!;

/** "4,5 ★ (12)" or null when nobody rated it yet. */
export function ratingLabel(average: number | null | undefined, count: number | null | undefined) {
  if (!average || !count) return null;
  return `${String(average).replace(".", ",")} ★ (${count})`;
}

/** Cleans an ISBN the way people type it (with dashes or spaces); null if it is not a valid length. */
export function cleanIsbn(input: string) {
  const digits = input.replace(/[\s-]/g, "");
  return /^[0-9]{10}([0-9]{3})?$/.test(digits) ? digits : null;
}
