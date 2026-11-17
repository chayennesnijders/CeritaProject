import qrcode from "qrcode-generator";

/**
 * Cerita Ambassadors: points, levels and the personal link. Pure data, so the portal (/ambassadeur),
 * Beheer and the tests agree. Rewards are digital for now and only start at the launch of the app.
 */
export const APP_URL = "https://app.ceritaproject.nl";

export const AMBASSADOR_MIN_AGE = 18;

/** Points (same rules as ambassador_points() in update-72). */
export const POINTS = { signup: 3, activeWeek: 2, recruit: 3, recruitStarted: 2, challenge: 1 } as const;
export const POINTS_PER_SIGNUP = POINTS.signup;

export const POINT_RULES = [
  { emoji: "🔗", label: "Iemand meldt zich aan of downloadt de app via jouw link", points: POINTS.signup },
  { emoji: "📆", label: "Extra als diegene een week actief is (5 van de eerste 7 dagen)", points: POINTS.activeWeek },
  { emoji: "🤝", label: "Je haalt een nieuwe ambassadeur erbij die meedoet", points: POINTS.recruit },
  { emoji: "⭐", label: "Extra als jouw nieuwe ambassadeur zijn eerste aanmelding of download heeft", points: POINTS.recruitStarted },
  { emoji: "🏆", label: "Een challenge voltooid (na goedkeuring)", points: POINTS.challenge },
] as const;

/** Ways to get people to sign up through your link. */
export const WAYS = [
  { emoji: "📱", label: "Een post delen over CeritaProject (max. 2 per week)" },
  { emoji: "🏆", label: "Meedoen met de challenges (en 1 punt per challenge)" },
  { emoji: "🏫", label: "Offline, via vrienden en scholen" },
] as const;

export const LEVELS = [
  { id: "starter", name: "Starter", emoji: "🌱", min: 10, reward: "Ambassadeursbadge in je profiel" },
  { id: "creator", name: "Creator", emoji: "🎬", min: 30, reward: "Exclusieve outfit voor je diertje" },
  { id: "influencer", name: "Influencer", emoji: "✨", min: 60, reward: "Speciale kleur voor je diertje + shoutout" },
  { id: "legend", name: "Legend", emoji: "👑", min: 100, reward: "Plek in de Cerita Hall of Fame" },
] as const;
export type Level = (typeof LEVELS)[number];

/** Legends who said yes appear in the Hall of Fame. Keep equal to the 100 in hall_of_fame() (update-67). */
export const HALL_OF_FAME_MIN = 100;

export type PointCounts = { signups: number; activeWeek?: number; recruits?: number; recruitsStarted?: number; challenges?: number };

export function totalPoints(c: PointCounts | number): number {
  const n = typeof c === "number" ? { signups: c } : c;
  const v = (x: number | undefined) => Math.max(0, Math.floor(Number(x) || 0));
  return v(n.signups) * POINTS.signup + v(n.activeWeek) * POINTS.activeWeek + v(n.recruits) * POINTS.recruit + v(n.recruitsStarted) * POINTS.recruitStarted + v(n.challenges) * POINTS.challenge;
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

/** The welcome a new ambassador sees in the portal before agreeing (the same text the team sends by WhatsApp). */
export const WELCOME = {
  title: "Welkom bij Cerita Ambassadors! 💖",
  intro:
    "Wat leuk dat je ambassadeur van CeritaProject wordt. Samen zorgen we dat meer jongeren een plek vinden waar ze zich niet de enige voelen. Dankjewel dat je daarbij helpt.",
  steps: [
    "Lees de afspraken en klik op ‘Ik doe mee’.",
    "Je krijgt je eigen link en QR-code. Zet ze in je bio of story, of print je eigen flyer.",
    "Je verdient 3 punten als iemand zich aanmeldt of de app downloadt via jouw link, en 2 extra als diegene een week actief is. Haal je een nieuwe ambassadeur erbij? Dan krijg je 3 punten, en 2 extra bij zijn eerste aanmelding. Elke voltooide challenge is 1 punt.",
  ],
  launch: "Je punten tellen vanaf nu. De beloningen gaan in zodra de app gelanceerd is. Je kunt de webversie nu al gebruiken.",
  contact: "Heb je een vraag of een idee voor de app? Stuur ons een bericht via de app. Dat kan altijd.",
  signoff: "Veel plezier, en welkom in het team! 💌 Chayenne | CeritaProject",
} as const;

export const AMBASSADOR_RULES = [
  "Zet #samenwerking bij je posts.",
  "Stuur nooit zelf een DM naar jongeren om ze over te halen.",
  "Deel nooit namen, foto's of verhalen van andere leden.",
  "Hang flyers alleen op als het mag, en niet op basisscholen.",
  "Vertelt iemand je dat het niet goed gaat? Verwijs naar 113 (0800-0113), de Kindertelefoon (0800-0432) of bij gevaar 112.",
] as const;

/** Extra rules for spreading the word offline (flyers, posters, QR code). */
export const OFFLINE_RULES = [
  "Hang een flyer of poster alleen op als het mag van de school of de plek.",
  "Niet op basisscholen: de app is vanaf 13 jaar.",
  "Schrijf nooit zelf e-mailadressen of telefoonnummers van anderen op. Iedereen meldt zich zelf aan.",
  "Spreek geen jongeren aan die je niet kent om ze over te halen. Vertel het aan mensen die je kent.",
  "Is iemand jonger dan 16? Dan meldt die zich samen met een ouder of verzorger aan.",
  "Stuur je een foto in? Zorg dat er geen herkenbare mensen op staan.",
] as const;

/** The link on a printed flyer: an ambassador's own link, or a plain one (bron=flyer) for flyers from the team. */
export function flyerLink(code?: string | null): string {
  return code && isAmbassadorCode(code) ? referralLink(code) : `${APP_URL}/wachtlijst?bron=flyer`;
}

export function isAmbassadorCode(code: string): boolean {
  return /^[a-z0-9]{2,20}$/.test(code);
}

/** QR code as a grid of dark (true) and light modules, for SVG on screen and a PNG to download. */
export function qrMatrix(text: string): boolean[][] {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
}

/** One SVG path for all dark modules (with a quiet zone of `margin` modules). */
export function qrPath(m: boolean[][], margin = 2): string {
  let d = "";
  m.forEach((row, r) => row.forEach((dark, c) => {
    if (dark) d += `M${c + margin} ${r + margin}h1v1h-1z`;
  }));
  return d;
}

/** Assignments are planned per week: shown from `starts` up to and including `due` (dates as YYYY-MM-DD, Dutch time). */
export type PlannedTask = { starts: string | null; due: string | null; active: boolean };

export function isCurrentTask(t: PlannedTask, today: string): boolean {
  return t.active && (!t.starts || t.starts <= today) && (!t.due || t.due >= today);
}

/** Planned for later (Beheer shows these apart from this week's assignments). */
export function isUpcomingTask(t: PlannedTask, today: string): boolean {
  return t.active && !!t.starts && t.starts > today;
}

/** Submissions: a public link, or a photo (for offline assignments such as a poster). */
export type SubmissionKind = "link" | "foto";
