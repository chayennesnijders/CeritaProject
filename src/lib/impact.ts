import { categoryLabel } from "@/lib/articles";

/** Anonymous numbers from public.impact_stats(); -1 means "less than 5" (hidden so nobody can be recognised). */
export type ImpactStats = {
  cijfers: Record<string, number>;
  onderwerpen: { category: string; n: number }[];
  gemaakt_op: string;
};

export const showCount = (n: number | undefined) =>
  n == null ? "–" : n < 0 ? "minder dan 5" : n.toLocaleString("nl-NL");

export const IMPACT_ROWS = [
  ["leden", "👥", "Leden in totaal"],
  ["nieuw_30d", "🌱", "Nieuwe leden (30 dagen)"],
  ["actief_7d", "⚡", "Actief deze week"],
  ["actief_30d", "📅", "Actief deze maand"],
  ["gelezen_30d", "📖", "Verhalen gelezen (30 dagen)"],
  ["gelezen_totaal", "📚", "Verhalen gelezen (totaal)"],
  ["reacties_steun", "💛", "Steunreacties op verhalen"],
  ["dagboek_30d", "📔", "Dagboekmomenten (30 dagen)"],
  ["groepsberichten_30d", "💬", "Berichten in groepen (30 dagen)"],
  ["verhalen_ingestuurd", "✍️", "Verhalen ingestuurd"],
  ["berichten_beheer", "💌", "Vragen aan de beheerders"],
  ["zorgsignalen_30d", "🆘", "Zorgsignalen opgepakt (30 dagen)"],
] as const;

/** Plain text to paste into an e-mail or report for a partner. */
export function impactSummary(s: ImpactStats, date = new Date(s.gemaakt_op)) {
  const c = s.cijfers;
  const lines = [
    `CeritaProject in cijfers (${date.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })})`,
    "",
    ...IMPACT_ROWS.map(([k, , label]) => `• ${label}: ${showCount(c[k])}`),
    "",
    `Leeftijdsgroepen: 12–15 jaar ${showCount(c["band_12_15"])}, 16–25 jaar ${showCount(c["band_16_25"])}, 26–27 jaar ${showCount(c["band_26_27"])}`,
  ];
  if (s.onderwerpen.length) {
    lines.push("", "Meest gelezen onderwerpen (90 dagen):");
    for (const o of s.onderwerpen.slice(0, 5))
      lines.push(`• ${categoryLabel(o.category)}: ${showCount(o.n)}`);
  }
  lines.push("", "Alle cijfers zijn anoniem. Aantallen kleiner dan 5 laten we niet zien.");
  return lines.join("\n");
}
