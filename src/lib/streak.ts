/** Shift a YYYY-MM-DD day by n days. */
export const shiftDay = (day: string, n: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/**
 * Days in a row on which you did something (cared for your pet or wrote in your diary).
 * Today still counts as "in progress": if you did nothing yet today, the streak from yesterday stays.
 */
export function streakDays(active: Set<string>, today: string) {
  let day = active.has(today) ? today : shiftDay(today, -1);
  let n = 0;
  while (active.has(day)) {
    n++;
    day = shiftDay(day, -1);
  }
  return n;
}
