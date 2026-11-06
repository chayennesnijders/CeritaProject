/**
 * Lessons for teachers. A school gets a code (like "KX7P-2M9Q") with its licence; teachers enter it
 * on /lessen to download the lessons. Free lessons (a trial lesson) need no code. Teachers need no
 * account, so they never come near the young people's part of the app.
 */

/** Letters and digits that are easy to read and type (no 0/O, 1/I/L). */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** "kx7p 2m9q", "KX7P-2M9Q" or "kx7p2m9q" all become "KX7P-2M9Q"; anything else null. */
export function normalizeCode(input: string): string | null {
  const plain = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (plain.length !== 8) return null;
  return `${plain.slice(0, 4)}-${plain.slice(4)}`;
}

/** A new school code, from random bytes (pass crypto.getRandomValues output). */
export function makeCode(random: Uint8Array): string {
  if (random.length < 8) throw new Error("Need 8 random bytes");
  const chars = Array.from(random.slice(0, 8), (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4)}`;
}

export type License = { active: boolean; valid_until: string };

/** A licence works while it is switched on and its last day (inclusive) has not passed. */
export function licenseWorks(l: License | null | undefined, today: string): boolean {
  return !!l && l.active && l.valid_until >= today;
}

/** May this file be downloaded? Free lessons always; others only with a working school code. */
export function mayDownload(lesson: { is_free: boolean; published: boolean }, licenseOk: boolean): boolean {
  return lesson.published && (lesson.is_free || licenseOk);
}

/** The date in the Netherlands as YYYY-MM-DD. */
export const dutchToday = (now = new Date()) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Amsterdam" }).format(now);

/** End of the current school year (31 July), the usual end date for a new licence. */
export function schoolYearEnd(today: string): string {
  const [y, m] = today.split("-").map(Number) as [number, number];
  return `${m >= 8 ? y + 1 : y}-07-31`;
}
