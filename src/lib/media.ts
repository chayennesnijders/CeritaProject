/** Podcasts, interviews and videos in "Luisteren & kijken". */
export const MEDIA_KINDS = {
  podcast: { emoji: "🎙️", label: "Podcast" },
  interview: { emoji: "🎤", label: "Interview" },
  video: { emoji: "🎬", label: "Video" },
} as const;
export type MediaKind = keyof typeof MEDIA_KINDS;
export const mediaKind = (k: string) => MEDIA_KINDS[k as MediaKind] ?? MEDIA_KINDS.podcast;

/** "45 sec", "12 min", "1 u 5 min". */
export function formatDuration(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds)) return "";
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} sec`;
  const min = Math.round(s / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return rest ? `${h} u ${rest} min` : `${h} u`;
}

/** Player clock: "4:05" or "1:02:09". */
export function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** Live now, or planned for later (admins see planned items too). */
export const isLive = (item: { publish_at: string }, now: Date = new Date()) =>
  Date.parse(item.publish_at) <= now.getTime();

/** "New" for a week after it went live. */
export const isFresh = (item: { publish_at: string }, now: Date = new Date()) =>
  isLive(item, now) && now.getTime() - Date.parse(item.publish_at) < 7 * 86_400_000;

/** Value for an <input type="datetime-local"> from an ISO time, in the device's own time zone. */
export function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Playback speeds the player cycles through. */
export const SPEEDS = [1, 1.25, 1.5, 2] as const;
export const nextSpeed = (s: number) =>
  SPEEDS[(SPEEDS.indexOf(s as (typeof SPEEDS)[number]) + 1) % SPEEDS.length]!;

/** Where to start again: the saved spot, unless you were (almost) at the end. */
export const resumeAt = (saved: number, duration: number) =>
  saved > 5 && (!duration || saved < duration - 10) ? saved : 0;
