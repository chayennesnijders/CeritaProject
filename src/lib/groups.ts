export type GroupBand = "junior" | "senior" | "adult";

type BandOpts = { ageGroup?: GroupBand | null | undefined; isAdmin?: boolean | undefined; showAll?: boolean | undefined };

/**
 * Een lid ziet alleen de groepen van zijn of haar eigen leeftijdsgroep.
 * Beheerders mogen alle groepen zien, maar pas als ze dat zelf expliciet kiezen.
 */
export function visibleGroups<T extends { age_group: string }>(groups: T[], opts: BandOpts = {}): T[] {
  if (opts.isAdmin && opts.showAll) return groups;
  if (!opts.ageGroup) return [];
  return groups.filter((g) => g.age_group === opts.ageGroup);
}

/** Groepen die buiten de eigen leeftijdsgroep vallen (voor de beheer-knop). */
export function otherBandGroups<T extends { age_group: string }>(groups: T[], opts: { ageGroup?: GroupBand | null | undefined } = {}): T[] {
  if (!opts.ageGroup) return groups;
  return groups.filter((g) => g.age_group !== opts.ageGroup);
}

export const BAND_ORDER: GroupBand[] = ["junior", "senior", "adult"];

/** Groepeert groepen op leeftijdsgroep in vaste volgorde; lege groepen vallen weg. */
export function groupsByBand<T extends { age_group: string }>(groups: T[]) {
  return BAND_ORDER.map((band) => ({ band, groups: groups.filter((g) => g.age_group === band) })).filter((x) => x.groups.length > 0);
}

export type Mentionable = { user_id: string; display_name: string; username?: string | null };

/** Vindt @vermeldingen in een bericht en koppelt ze aan groepsleden (op gebruikersnaam of naam). */
export function parseMentions(body: string, members: Mentionable[]): string[] {
  const found = new Set<string>();
  for (const m of body.matchAll(/@([A-Za-z0-9_.-]+)/g)) {
    const token = m[1]!.toLowerCase();
    const hit = members.find(
      (mem) => mem.username?.toLowerCase() === token || mem.display_name.toLowerCase().replace(/\s+/g, "") === token,
    );
    if (hit) found.add(hit.user_id);
  }
  return [...found];
}

/** Splitst een bericht in stukjes tekst en @vermeldingen, zodat de app ze kan inkleuren. */
export function splitMentions(body: string): { text: string; mention: boolean }[] {
  const parts: { text: string; mention: boolean }[] = [];
  let last = 0;
  for (const m of body.matchAll(/@([A-Za-z0-9_.-]+)/g)) {
    const i = m.index;
    if (i > last) parts.push({ text: body.slice(last, i), mention: false });
    parts.push({ text: m[0], mention: true });
    last = i + m[0].length;
  }
  if (last < body.length) parts.push({ text: body.slice(last), mention: false });
  return parts;
}
