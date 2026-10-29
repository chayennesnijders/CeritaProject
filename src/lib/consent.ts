/** Whole years someone is old on a given day (YYYY-MM-DD strings). */
export function ageOn(birthdate: string, day: string) {
  const [by, bm, bd] = birthdate.slice(0, 10).split("-").map(Number);
  const [ty, tm, td] = day.split("-").map(Number);
  if (!by || !bm || !bd || !ty || !tm || !td) return null;
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

export type Consent = { terms_version: string; parent_confirmed_at: string | null } | null;

/**
 * What a member still has to agree to: the current house rules and privacy statement, and under 16
 * the confirmation that a parent or carer knows. null = nothing.
 */
export function consentNeeded(consent: Consent, version: string, age: number | null) {
  const terms = !consent || consent.terms_version !== version;
  const parent = age !== null && age < 16 && !consent?.parent_confirmed_at;
  return terms || parent ? { terms, parent } : null;
}
