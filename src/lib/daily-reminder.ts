/**
 * The daily reminder for your pet (opt-in, from the home screen or Profiel): once a day at the hour
 * you chose, a push if you have not cared for your pet or written in your diary yet that day.
 * Quiet hours still win (pushToUser skips them).
 */
export const REMINDER_HOURS = [16, 17, 18, 19, 20, 21] as const;
export const DEFAULT_REMINDER_HOUR = 19;

/** Whether to send today's reminder now. */
export function shouldRemind(p: {
  enabled: boolean;
  hour: number | null;
  remindedOn: string | null;
  today: string;
  hourNow: number;
  didSomethingToday: boolean;
}): boolean {
  if (!p.enabled || p.remindedOn === p.today || p.didSomethingToday) return false;
  return p.hourNow === (p.hour ?? DEFAULT_REMINDER_HOUR);
}

/** The push text, warmer when there is a streak to keep. */
export function reminderPush(streak: number) {
  return {
    title: "🐰 Je diertje mist je!",
    body:
      streak > 1
        ? `Even een minuutje? Je 🔥 reeks staat op ${streak} dagen. Overslaan mag ook, dat is oké.`
        : "Even een minuutje voor je diertje of je dagboek? Overslaan mag ook, dat is oké.",
    link: "/diertje",
  };
}
