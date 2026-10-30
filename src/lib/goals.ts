/** Most open goals at once (same as the database). */
export const MAX_GOALS = 5;
export const GOAL_IDEAS = [
  { emoji: "🚶", title: "10 minuten wandelen" },
  { emoji: "💧", title: "6 glazen water drinken" },
  { emoji: "😴", title: "Voor 23:00 naar bed" },
  { emoji: "📵", title: "Een uur zonder telefoon" },
  { emoji: "📖", title: "10 bladzijden lezen" },
  { emoji: "🧘", title: "Rustmoment met Riti" },
] as const;

const prev = (day: string) => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

/** Days in a row a goal was ticked, up to today (or yesterday while today is still open). */
export function goalStreak(days: string[], today: string) {
  const set = new Set(days);
  let day = set.has(today) ? today : prev(today);
  let n = 0;
  while (set.has(day)) {
    n++;
    day = prev(day);
  }
  return n;
}

/** The last 7 days (oldest first), for the little row of dots. */
export function lastWeek(today: string) {
  const out = [today];
  for (let i = 0; i < 6; i++) out.unshift(prev(out[0]!));
  return out;
}

/** First day of the month (YYYY-MM-01) for a day, used for the theme of the month. */
export const monthOf = (day: string) => `${day.slice(0, 7)}-01`;
