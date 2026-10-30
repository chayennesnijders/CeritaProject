export const LETTER_MONTHS = [1, 3, 6, 12] as const;

/** Whole days from `today` until `day` (both YYYY-MM-DD); 0 or less means it may be opened. */
export function daysUntil(day: string, today: string) {
  return Math.round(
    (Date.parse(`${day}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000,
  );
}

export function letterWaitText(day: string, today: string) {
  const d = daysUntil(day, today);
  if (d <= 0) return "Mag open!";
  if (d === 1) return "Morgen mag hij open";
  if (d < 60) return `Nog ${d} dagen`;
  return `Nog ${Math.round(d / 30)} maanden`;
}
