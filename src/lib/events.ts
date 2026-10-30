/** Is a meetup still to come, going on now, or over? */
export function eventStatus(startsAt: string, minutes: number, now: Date = new Date()) {
  const start = Date.parse(startsAt);
  if (now.getTime() < start) return "straks" as const;
  if (now.getTime() < start + minutes * 60_000) return "bezig" as const;
  return "voorbij" as const;
}

/** A reminder goes out in the hour before the start. */
export const remindNow = (startsAt: string, now: Date = new Date()) => {
  const left = Date.parse(startsAt) - now.getTime();
  return left > 0 && left <= 60 * 60_000;
};

/** "donderdag 6 november, 19:00" in Dutch time. */
export const eventTime = (iso: string) =>
  new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

export const minutesUntil = (iso: string, now: Date = new Date()) =>
  Math.max(0, Math.round((Date.parse(iso) - now.getTime()) / 60_000));
