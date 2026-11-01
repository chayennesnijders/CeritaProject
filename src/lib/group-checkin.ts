import { MOODS } from "@/lib/home";

/** What the check-in says after you picked, based on how many others feel the same this week. */
export function sameFeelingText(mood: string, totals: { mood: string; total: number }[]) {
  const same = (totals.find((t) => t.mood === mood)?.total ?? 1) - 1;
  const label = MOODS.find((m) => m.id === mood)?.label.toLowerCase() ?? "zo";
  if (same <= 0) return "Dank je voor het delen 🤍";
  return `Je bent niet de enige: ${same} ${same === 1 ? "ander voelt" : "anderen voelen"} zich deze week ook ${label} 🤍`;
}
