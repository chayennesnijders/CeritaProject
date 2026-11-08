import { bandLabel } from "@/lib/auth";

export type BandPerson = {
  age_group?: string | null;
  birthdate?: string | null;
  is_parent?: boolean | null;
};

/**
 * How Beheer describes someone's place in the app. Every profile carries an age_group (the database
 * default is "senior"), but parents and carers never have a birthdate and never belong to an age band,
 * so they must not be shown as "Groep 16–25".
 */
export function memberBand(p: BandPerson): string {
  if (p.is_parent) return "Ouder/verzorger";
  if (!p.birthdate) return "Leeftijd nog onbekend";
  return p.age_group ? bandLabel(p.age_group) : "Leeftijd nog onbekend";
}

/** The same, with the emoji used on chips. */
export function memberBandChip(p: BandPerson): string {
  if (p.is_parent) return "👨‍👩‍👧 Ouder/verzorger";
  if (!p.birthdate || !p.age_group) return "❔ Leeftijd nog onbekend";
  return `👥 Groep ${bandLabel(p.age_group)}`;
}
