/**
 * Answers to your reports and warnings from the admins show on the home screen until you tap
 * "Oké, gezien" (remembered on this device), and answers disappear by themselves after two weeks.
 * An active time-out always stays visible.
 */
export const NOTICE_DAYS = 14;

export const warningKey = (createdAt: string) => `w:${createdAt}`;

/** Which report answers still show. */
export function visibleResponses<T extends { id: string; responded_at: string | null }>(
  rows: readonly T[],
  seen: ReadonlySet<string>,
  now = Date.now(),
): T[] {
  return rows.filter(
    (r) => !seen.has(r.id) && !!r.responded_at && now - Date.parse(r.responded_at) < NOTICE_DAYS * 86_400_000,
  );
}

/** Whether the latest warning still shows. */
export const warningVisible = (w: { created_at: string } | null, seen: ReadonlySet<string>) =>
  !!w && !seen.has(warningKey(w.created_at));

const storeKey = (uid: string) => `cerita-gezien-meldingen-${uid}`;

export function readSeen(uid: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(storeKey(uid)) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function markSeen(uid: string, key: string): Set<string> {
  const next = readSeen(uid);
  next.add(key);
  try {
    // Keep the list small: only the latest 100.
    localStorage.setItem(storeKey(uid), JSON.stringify([...next].slice(-100)));
  } catch {
    /* not remembered on this device: it shows again next time */
  }
  return next;
}
