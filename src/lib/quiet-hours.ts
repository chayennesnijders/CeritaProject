/** Is `hour` (0–23) inside the quiet hours from `start` up to (not including) `end`? Works across midnight. */
export function inQuietHours(
  hour: number,
  start: number | null | undefined,
  end: number | null | undefined,
) {
  if (start == null || end == null || start === end) return false;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

/** The current hour in the Netherlands. */
export const dutchHourNow = (now: Date = new Date()) =>
  Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Amsterdam",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );

export const QUIET_PRESETS = [
  { id: "uit", label: "Uit", start: null, end: null },
  { id: "nacht", label: "22:00 – 07:00", start: 22, end: 7 },
  { id: "vroeg", label: "21:00 – 08:00", start: 21, end: 8 },
  { id: "school", label: "Onder schooltijd (08:00 – 15:00)", start: 8, end: 15 },
] as const;
