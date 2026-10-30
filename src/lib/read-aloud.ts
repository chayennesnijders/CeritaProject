/**
 * Splits a text into pieces of at most `max` characters, at the end of a sentence where possible.
 * Phone voices stop halfway through very long texts, so we read it piece by piece.
 */
export function speechChunks(text: string, max = 220) {
  const sentences =
    text
      .replace(/\s+/g, " ")
      .trim()
      .match(/[^.!?]+[.!?]*\s*/g) ?? [];
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + s).length > max && cur) {
      out.push(cur.trim());
      cur = "";
    }
    if (s.length > max) {
      for (let i = 0; i < s.length; i += max) out.push(s.slice(i, i + max).trim());
      continue;
    }
    cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
}
