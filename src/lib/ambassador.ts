/**
 * Cerita Ambassadors: points, levels and the personal link. Pure data, so the portal (/ambassadeur),
 * Beheer and the tests agree. Rewards are digital for now and only start at the launch of the app.
 */
export const APP_URL = "https://app.ceritaproject.nl";

export const AMBASSADOR_MIN_AGE = 18;

/** How you earn points. Sign-ups are counted automatically; the rest after approval in Beheer. */
export const POINT_RULES = [
  { emoji: "🔗", label: "Iemand zet zich op de wachtlijst via jouw link", points: 1 },
  { emoji: "📱", label: "Post over CeritaProject (goedgekeurd, max. 2 per week)", points: 2 },
  { emoji: "🏆", label: "Een opdracht of challenge voltooid", points: 5 },
  { emoji: "🚀", label: "Na de lancering: iemand maakt een account via jouw link", points: 3 },
] as const;

export const LEVELS = [
  { id: "starter", name: "Starter", emoji: "🌱", min: 10, reward: "Ambassadeursbadge in je profiel" },
  { id: "creator", name: "Creator", emoji: "🎬", min: 30, reward: "Exclusieve outfit voor je diertje" },
  { id: "influencer", name: "Influencer", emoji: "✨", min: 60, reward: "Speciale kleur voor je diertje + shoutout" },
  { id: "legend", name: "Legend", emoji: "👑", min: 100, reward: "Plek in de Cerita Hall of Fame + meedenken over nieuwe functies" },
] as const;
export type Level = (typeof LEVELS)[number];

export function totalPoints(signups: number, taskPoints: number): number {
  return Math.max(0, Math.floor(signups)) + Math.max(0, Math.floor(taskPoints));
}

/** The highest level reached, or null below the first one. */
export function levelFor(points: number): Level | null {
  let found: Level | null = null;
  for (const l of LEVELS) if (points >= l.min) found = l;
  return found;
}

/** The next level with how many points are still needed, or null at the top. */
export function nextLevel(points: number): { level: Level; missing: number; progress: number } | null {
  const next = LEVELS.find((l) => points < l.min);
  if (!next) return null;
  const prevMin = levelFor(points)?.min ?? 0;
  return { level: next, missing: next.min - points, progress: (points - prevMin) / (next.min - prevMin) };
}

/** The personal link to the waitlist. Sign-ups through it carry the source amb-<code>. */
export function referralLink(code: string): string {
  return `${APP_URL}/wachtlijst?bron=amb-${encodeURIComponent(code)}`;
}

/** Submissions must be a public https link (a post on TikTok, Instagram and so on). */
export function isSubmissionUrl(url: string): boolean {
  const u = url.trim();
  if (!/^https:\/\/\S+$/.test(u) || u.length > 300) return false;
  try {
    return !!new URL(u).hostname.includes(".");
  } catch {
    return false;
  }
}

export const AMBASSADOR_RULES = [
  "Zet #samenwerking of ‘ambassadeur van CeritaProject’ bij je posts.",
  "Stuur nooit zelf een DM naar jongeren om ze over te halen. Je deelt alleen je link in je eigen posts, bio of story.",
  "Deel nooit namen, foto's of verhalen van andere leden.",
  "Beloof niks wat de app niet doet, en noem CeritaProject nooit hulpverlening.",
  "Vertelt iemand je dat het niet goed gaat? Verwijs naar 113 (0800-0113), de Kindertelefoon (0800-0432) of bij gevaar 112.",
  "Wees jezelf. Je hoeft niks te faken.",
] as const;
