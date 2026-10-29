/** One line in the admins' Nieuws list. */
export type NewsItem = {
  kind: string;
  ref_id: string;
  title: string;
  detail: string;
  created_at: string;
};

/** What each kind of news looks like, and which Beheer tab handles it. */
export const NEWS_KINDS = {
  aanmelding: { emoji: "🎉", label: "Nieuw lid", tab: "groepen" },
  bestelling: { emoji: "🛍️", label: "Nieuwe bestelling", tab: "overzicht" },
  verhaal: { emoji: "✍️", label: "Verhaal ingestuurd", tab: "verhalen" },
  bericht: { emoji: "💌", label: "Bericht van een lid", tab: "berichten" },
  melding: { emoji: "🚩", label: "Melding", tab: "inbox" },
} as const;
export type NewsKind = keyof typeof NEWS_KINDS;
export const newsKind = (k: string) =>
  NEWS_KINDS[k as NewsKind] ?? { emoji: "📣", label: "Nieuws", tab: "overzicht" as const };

/** Items newer than the moment you last opened Nieuws (everything when you never did). */
export const isNew = (item: NewsItem, seenAt: string | null) => !seenAt || item.created_at > seenAt;

/** Reports already have their own badge, so the Beheer badge only adds the other new news. */
export const unreadNews = (items: NewsItem[], seenAt: string | null) =>
  items.filter((i) => i.kind !== "melding" && isNew(i, seenAt)).length;

/** Counts per kind, for the tiles at the top. */
export function newsCounts(items: NewsItem[], since: string) {
  const counts: Record<string, number> = {};
  for (const i of items) if (i.created_at >= since) counts[i.kind] = (counts[i.kind] ?? 0) + 1;
  return counts;
}

/** "Vandaag", "Gisteren" or a date, for grouping the list (Dutch time). */
export function dayLabel(iso: string, now: Date = new Date()) {
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(d);
  const day = fmt(new Date(iso));
  if (day === fmt(now)) return "Vandaag";
  if (day === fmt(new Date(now.getTime() - 86_400_000))) return "Gisteren";
  return new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
}

const PLURAL: Record<NewsKind, [string, string]> = {
  aanmelding: ["nieuw lid", "nieuwe leden"],
  bestelling: ["bestelling", "bestellingen"],
  verhaal: ["ingestuurd verhaal", "ingestuurde verhalen"],
  bericht: ["bericht", "berichten"],
  melding: ["melding", "meldingen"],
};

/** Push text for an admin about news since the last check; orders only for the owner. */
export function adminPushMessage(items: Pick<NewsItem, "kind" | "title">[], isOwner: boolean) {
  const mine = items.filter((i) => i.kind in NEWS_KINDS && (i.kind !== "bestelling" || isOwner));
  if (mine.length === 0) return null;
  if (mine.length === 1) {
    const k = newsKind(mine[0]!.kind);
    return { title: `${k.emoji} ${k.label}`, body: mine[0]!.title };
  }
  const counts = new Map<NewsKind, number>();
  for (const i of mine) counts.set(i.kind as NewsKind, (counts.get(i.kind as NewsKind) ?? 0) + 1);
  const parts = [...counts].map(([k, n]) => `${n} ${PLURAL[k][n === 1 ? 0 : 1]}`);
  return { title: "📰 Nieuws in CeritaProject", body: parts.join(", ") };
}
