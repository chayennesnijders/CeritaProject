/**
 * Ambassador links: remember the ?bron=amb-<code> someone arrived with, so the account they make later counts
 * for that ambassador (claim_referral), and mark the days a member opens the app (mark_active, only the date).
 * Pure helpers here; the calls live in AppShell. Ambassadors only ever see counts.
 */
export const REF_KEY = "cerita-bron-amb";
export const ACTIVE_KEY = "cerita-actief-op";
const KEEP_DAYS = 30;

/** The ambassador source in a URL search string, or null. */
export function ambSourceFrom(search: string): string | null {
  const bron = new URLSearchParams(search).get("bron")?.trim().toLowerCase() ?? "";
  return /^amb-[a-z0-9]{2,20}$/.test(bron) ? bron : null;
}

/** A stored source is used only within 30 days of the visit. */
export function storedSource(raw: string | null, now = Date.now()): string | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as { source?: string; at?: number };
    if (!v.source || !/^amb-[a-z0-9]{2,20}$/.test(v.source) || typeof v.at !== "number") return null;
    return now - v.at <= KEEP_DAYS * 86_400_000 ? v.source : null;
  } catch {
    return null;
  }
}

export function rememberSource(storage: Pick<Storage, "setItem">, source: string, now = Date.now()) {
  storage.setItem(REF_KEY, JSON.stringify({ source, at: now }));
}
