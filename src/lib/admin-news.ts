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
  groep: { emoji: "👥", label: "Nieuwe groep van een lid", tab: "groepen" },
  vraag: { emoji: "🧑‍🏫", label: "Vraag voor een coach", tab: "vragen" },
  gemeen: { emoji: "🤬", label: "Vaak gemene woorden", tab: "inbox" },
  inzending: { emoji: "🎨", label: "Inzending thema", tab: "thema" },
  bestelling: { emoji: "🛍️", label: "Nieuwe bestelling", tab: "overzicht" },
  retour: { emoji: "↩️", label: "Retour aangevraagd", tab: "overzicht" },
  verhaal: { emoji: "✍️", label: "Verhaal ingestuurd", tab: "verhalen" },
  bericht: { emoji: "💌", label: "Bericht van een lid", tab: "berichten" },
  contact: { emoji: "📬", label: "Contactformulier", tab: "berichten" },
  melding: { emoji: "🚩", label: "Melding", tab: "inbox" },
  zorg: { emoji: "🆘", label: "Zorgsignaal", tab: "inbox" },
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
  groep: ["nieuwe groep", "nieuwe groepen"],
  vraag: ["vraag voor een coach", "vragen voor een coach"],
  gemeen: ["lid met veel gemene woorden", "leden met veel gemene woorden"],
  inzending: ["inzending voor het thema", "inzendingen voor het thema"],
  bestelling: ["bestelling", "bestellingen"],
  retour: ["retour", "retouren"],
  verhaal: ["ingestuurd verhaal", "ingestuurde verhalen"],
  bericht: ["bericht", "berichten"],
  contact: ["vraag via het contactformulier", "vragen via het contactformulier"],
  melding: ["melding", "meldingen"],
  zorg: ["zorgsignaal", "zorgsignalen"],
};

/** Push text for an admin about news since the last check; orders only for the owner. */
export function adminPushMessage(items: Pick<NewsItem, "kind" | "title">[], isOwner: boolean) {
  const mine = items.filter(
    (i) => i.kind in NEWS_KINDS && ((i.kind !== "bestelling" && i.kind !== "retour") || isOwner),
  );
  if (mine.length === 0) return null;
  // Care signals come first and get their own urgent title.
  const care = mine.filter((i) => i.kind === "zorg").length;
  if (care > 0) {
    const others = mine.length - care;
    return {
      title: "🆘 Zorgsignaal: kijk even mee",
      body: `${care === 1 ? "Iemand schreef" : `${care} keer schreef iemand`} iets zorgwekends.${others ? ` En ${others} ander nieuws.` : ""}`,
    };
  }
  if (mine.length === 1) {
    const k = newsKind(mine[0]!.kind);
    return { title: `${k.emoji} ${k.label}`, body: mine[0]!.title };
  }
  const counts = new Map<NewsKind, number>();
  for (const i of mine) counts.set(i.kind as NewsKind, (counts.get(i.kind as NewsKind) ?? 0) + 1);
  const parts = [...counts].map(([k, n]) => `${n} ${PLURAL[k][n === 1 ? 0 : 1]}`);
  return { title: "📰 Nieuws in CeritaProject", body: parts.join(", ") };
}
