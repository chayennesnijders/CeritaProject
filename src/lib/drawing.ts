/** Colours in the drawing screen: the CeritaProject palette plus a few bright ones. */
export const DRAW_COLORS = [
  "#2a1a14",
  "#e7a4a9",
  "#d9667a",
  "#f2a33a",
  "#f5d547",
  "#a7b78a",
  "#4f9d69",
  "#6bb3e0",
  "#3b5bdb",
  "#9b6bd6",
  "#8b5e4a",
  "#ffffff",
] as const;

export const BRUSH_SIZES = [
  { id: "dun", px: 4, label: "Dun" },
  { id: "midden", px: 10, label: "Midden" },
  { id: "dik", px: 24, label: "Dik" },
] as const;

/** Today's challenge asks you to draw something ("Teken…", "tekening"). */
export const isDrawingChallenge = (title: string | null | undefined) =>
  /\bteken/i.test(title ?? "");

/** Keep the undo list short so drawing stays fast on phones. */
export const MAX_UNDO = 25;
export function pushUndo<T>(stack: T[], item: T, max = MAX_UNDO): T[] {
  const next = [...stack, item];
  return next.length > max ? next.slice(next.length - max) : next;
}
