/**
 * Beheer, tidy: a Start screen plus every page in one of four groups, so nothing is hidden in a long
 * scrolling row of buttons. Which pages a role may open is still decided by src/lib/staff.ts.
 */
export const ADMIN_PAGES = {
  start: { emoji: "🏠", label: "Start" },
  inbox: { emoji: "🚩", label: "Meldingen & zorg" },
  berichten: { emoji: "💌", label: "Berichten" },
  vragen: { emoji: "🎓", label: "Vragen & coaches" },
  verhalen: { emoji: "📖", label: "Verhalen" },
  luisteren: { emoji: "🎧", label: "Podcasts" },
  muziek: { emoji: "🎵", label: "Muziek" },
  thema: { emoji: "🌈", label: "Thema" },
  agenda: { emoji: "📅", label: "Agenda" },
  groepen: { emoji: "👥", label: "Groepen" },
  nieuws: { emoji: "📰", label: "Nieuws" },
  overzicht: { emoji: "📊", label: "Overzicht & wachtlijst" },
  impact: { emoji: "💛", label: "Impact" },
  buddy: { emoji: "🤖", label: "CeritaBuddy" },
  lessen: { emoji: "🏫", label: "Lessen & scholen" },
  ouders: { emoji: "👪", label: "Ouderportaal" },
  livegang: { emoji: "🚀", label: "Livegang" },
  logboek: { emoji: "🗒️", label: "Logboek" },
  team: { emoji: "🧑‍🤝‍🧑", label: "Team" },
} as const;
export type AdminPage = keyof typeof ADMIN_PAGES;

export const ADMIN_GROUPS: { title: string; pages: AdminPage[] }[] = [
  { title: "Moderatie", pages: ["inbox", "berichten", "vragen"] },
  { title: "Inhoud", pages: ["verhalen", "luisteren", "muziek", "thema", "agenda", "buddy"] },
  { title: "Community", pages: ["groepen", "nieuws"] },
  { title: "Organisatie", pages: ["ouders", "lessen", "overzicht", "impact", "livegang", "logboek", "team"] },
];

/** The groups with only the pages this person may open (empty groups left out). */
export function visibleGroups(canSee: (page: AdminPage) => boolean) {
  return ADMIN_GROUPS.map((g) => ({ ...g, pages: g.pages.filter(canSee) })).filter(
    (g) => g.pages.length > 0,
  );
}
