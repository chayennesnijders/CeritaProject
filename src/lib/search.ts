/** Turns what someone types into a safe search term for an ilike filter (no % or , tricks). */
export function searchTerm(input: string) {
  const t = input
    .replace(/[%_,()\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  return t.length >= 2 ? t : null;
}

/** Does a text contain all words of the search (case and accents do not matter)? */
export function matches(text: string | null | undefined, term: string) {
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const hay = norm(text ?? "");
  return norm(term)
    .split(" ")
    .filter(Boolean)
    .every((w) => hay.includes(w));
}
