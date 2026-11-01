/**
 * Waiting list for the app (public page /wachtlijst): young people leave their e-mail address, their
 * age and which phone they have, so the owner can mail Android users first when the Play Store app is
 * ready.
 */
export const WAITLIST_STORES = [
  { id: "play", emoji: "🤖", label: "Android (Play Store)" },
  { id: "apple", emoji: "🍎", label: "iPhone (App Store)" },
  { id: "beide", emoji: "🤷", label: "Weet ik niet" },
] as const;
export type WaitlistStore = (typeof WAITLIST_STORES)[number]["id"];
export const storeLabel = (id: string) =>
  WAITLIST_STORES.find((s) => s.id === id)?.label ?? "Weet ik niet";

export const MIN_AGE = 13;
export const PARENT_AGE = 16;

export const isWaitlistEmail = (v: string) =>
  /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v.trim()) && v.trim().length <= 254;

export type WaitlistForm = {
  email: string;
  age: number | null;
  store: WaitlistStore | null;
  parentOk: boolean;
  privacyOk: boolean;
};

/** What still needs doing before the form can be sent (in simple Dutch), or null when it is ready. */
export function waitlistProblem(f: WaitlistForm): string | null {
  if (!isWaitlistEmail(f.email)) return "Vul een goed e-mailadres in.";
  if (f.age === null) return "Kies hoe oud je bent.";
  if (f.age < MIN_AGE) return "De app is vanaf 13 jaar. Kom terug als je 13 bent! 💛";
  if (!f.store) return "Kies wat voor telefoon je hebt.";
  if (f.age < PARENT_AGE && !f.parentOk)
    return "Vraag even aan je ouder of verzorger of het goed is, en vink het aan.";
  if (!f.privacyOk) return "Vink aan dat je het goed vindt dat we je een mail sturen.";
  return null;
}

/** Friendly name for where a sign-up came from (the ?bron= part of the link). */
const SOURCE_LABELS: Record<string, string> = {
  tiktok: "🎵 TikTok (bio)",
  story: "📱 Story",
  whatsapp: "💬 WhatsApp",
  instagram: "📸 Instagram",
  vriend: "🤝 Doorgestuurd door een vriend(in)",
};
export function sourceLabel(source: string | null | undefined) {
  const s = source?.trim().toLowerCase();
  if (!s) return "🔗 Zonder bron (link zonder ?bron=)";
  return SOURCE_LABELS[s] ?? `📍 ${s}`;
}

/** How many sign-ups per source, biggest first. */
export function countBySource(rows: { source: string | null }[]) {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const key = r.source?.trim().toLowerCase() || "";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([source, count]) => ({ source, label: sourceLabel(source), count }))
    .sort((a, b) => b.count - a.count);
}
