import { MOODS, type MoodId } from "@/lib/home";

/** Colour per mood in the calendar. */
export const MOOD_COLORS: Record<MoodId, string> = {
  super: "#f5c518",
  goed: "#8fd18b",
  "gaat-wel": "#b9c9e8",
  verdrietig: "#7ea6e0",
  gestrest: "#e88a8a",
};

/** The days of a month as weeks (Monday first); null = empty box before or after the month. */
export function monthGrid(year: number, month: number) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++)
    cells.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

const prevDay = (day: string) => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

/** How many days in a row you filled in your mood, up to today (or yesterday if today is still open). */
export function moodStreak(days: string[], today: string) {
  const set = new Set(days);
  let day = set.has(today) ? today : prevDay(today);
  let n = 0;
  while (set.has(day)) {
    n++;
    day = prevDay(day);
  }
  return n;
}

/** How often each mood was picked in a month, most first. */
export function moodCounts(entries: { day: string; mood: string }[], monthPrefix: string) {
  return MOODS.map((m) => ({
    mood: m,
    count: entries.filter((e) => e.day.startsWith(monthPrefix) && e.mood === m.id).length,
  }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);
}
