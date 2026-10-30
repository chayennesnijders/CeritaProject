/** One line in the Meldingen page. */
export type InboxItem = {
  id: string;
  emoji: string;
  title: string;
  detail?: string;
  to: string;
  count: number;
};

export type InboxInput = {
  dms: number;
  requests: number;
  groups: number;
  compliments: number;
  answers: number;
  myTurn: { id: string; game: string; where: string }[];
  letters: number;
  replies: number;
  meetups: { id: string; title: string; when: string }[];
};

/** Everything that wants your attention, most personal first. Empty kinds are left out. */
export function inboxItems(i: InboxInput): InboxItem[] {
  const n = (k: number, one: string, many: string) =>
    k === 1 ? one : many.replace("#", String(k));
  const out: InboxItem[] = [];
  if (i.requests)
    out.push({
      id: "requests",
      emoji: "👋",
      title: n(i.requests, "Iemand wil met je chatten", "# chatverzoeken"),
      to: "/berichten",
      count: i.requests,
    });
  if (i.dms)
    out.push({
      id: "dms",
      emoji: "💌",
      title: n(i.dms, "1 nieuw bericht", "# nieuwe berichten"),
      to: "/berichten",
      count: i.dms,
    });
  if (i.groups)
    out.push({
      id: "groups",
      emoji: "💬",
      title: n(i.groups, "1 nieuw bericht in je groepen", "# nieuwe berichten in je groepen"),
      to: "/community",
      count: i.groups,
    });
  for (const g of i.myTurn)
    out.push({
      id: `game-${g.id}`,
      emoji: "🎮",
      title: `Jouw beurt: ${g.game}`,
      detail: g.where,
      to: g.where,
      count: 1,
    });
  if (i.compliments)
    out.push({
      id: "compliments",
      emoji: "💐",
      title: n(i.compliments, "Iemand gaf je een compliment", "# nieuwe complimenten"),
      to: "/complimenten",
      count: i.compliments,
    });
  if (i.answers)
    out.push({
      id: "answers",
      emoji: "❓",
      title: n(i.answers, "Je vraag is beantwoord", "# vragen beantwoord"),
      to: "/vragen",
      count: i.answers,
    });
  if (i.replies)
    out.push({
      id: "replies",
      emoji: "🛡️",
      title: n(i.replies, "De beheerders gaven antwoord", "# antwoorden van de beheerders"),
      to: "/contact",
      count: i.replies,
    });
  if (i.letters)
    out.push({
      id: "letters",
      emoji: "💌",
      title: n(i.letters, "Je brief aan jezelf mag open", "# brieven mogen open"),
      to: "/brieven",
      count: i.letters,
    });
  for (const m of i.meetups)
    out.push({
      id: `meetup-${m.id}`,
      emoji: "📅",
      title: `Binnenkort: ${m.title}`,
      detail: m.when,
      to: "/agenda",
      count: 1,
    });
  return out;
}

export const inboxTotal = (items: InboxItem[]) => items.reduce((a, b) => a + b.count, 0);
