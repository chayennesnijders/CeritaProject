// Datums bij chatberichten: één datumkop per dag, in het Nederlands.

const weekdayFmt = new Intl.DateTimeFormat("nl-NL", { weekday: "long" });
const fullFmt = new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "numeric", month: "long" });
const shortFmt = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" });
const clockFmt = new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit" });

function midnight(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// De dag van een bericht, zoals die op dit apparaat geldt.
export function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Aantal dagen tussen toen en nu: 0 = vandaag, 1 = gisteren.
function dayDiff(iso: string, now: Date) {
  return Math.round((midnight(now).getTime() - midnight(new Date(iso)).getTime()) / 86_400_000);
}

export function isToday(iso: string, now = new Date()) {
  return dayKey(iso) === dayKey(now.toISOString());
}

// "Vandaag", "Gisteren", "woensdag" of "zondag 18 oktober".
export function dayLabel(iso: string, now = new Date()) {
  const diff = dayDiff(iso, now);
  if (diff === 0) return "Vandaag";
  if (diff === 1) return "Gisteren";
  if (diff > 1 && diff < 7) return weekdayFmt.format(midnight(new Date(iso)));
  return fullFmt.format(midnight(new Date(iso)));
}

// Kort stempeltje bij een bericht van een eerdere dag: "24 okt".
export const shortDay = (iso: string) => shortFmt.format(new Date(iso));

// Stempeltje bij een gesprek in de lijst: "14:37", "Gisteren 14:37" of "24 okt 14:37".
export function listStamp(iso: string, now = new Date()) {
  const t = clockFmt.format(new Date(iso));
  const diff = dayDiff(iso, now);
  if (diff === 0) return t;
  if (diff === 1) return `Gisteren ${t}`;
  return `${shortDay(iso)} ${t}`;
}

export type ChatRow<T> =
  | { kind: "day"; label: string; key: string }
  | { kind: "msg"; item: T };

// Berichten op volgorde, met een datumkop telkens als de dag wisselt.
export function withDayDividers<T>(items: T[], getDate: (item: T) => string, now = new Date()): ChatRow<T>[] {
  const rows: ChatRow<T>[] = [];
  let prev = "";
  for (const item of items) {
    const iso = getDate(item);
    const key = dayKey(iso);
    if (key !== prev) {
      rows.push({ kind: "day", label: dayLabel(iso, now), key });
      prev = key;
    }
    rows.push({ kind: "msg", item });
  }
  return rows;
}
