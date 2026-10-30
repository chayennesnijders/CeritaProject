/** Text size for the whole app: the root font size, so everything in rem grows with it. */
export const TEXT_SIZES = [
  { id: "normaal", label: "Normaal", px: 16 },
  { id: "groot", label: "Groot", px: 18 },
  { id: "extra", label: "Extra groot", px: 20 },
] as const;
export type TextSize = (typeof TEXT_SIZES)[number]["id"];
export const TEXT_SIZE_KEY = "cerita-tekstgrootte";

export const textSizePx = (id: string | null | undefined) =>
  (TEXT_SIZES.find((t) => t.id === id) ?? TEXT_SIZES[0]).px;

export function getTextSize(): TextSize {
  try {
    const v = localStorage.getItem(TEXT_SIZE_KEY);
    return TEXT_SIZES.some((t) => t.id === v) ? (v as TextSize) : "normaal";
  } catch {
    return "normaal";
  }
}

export function setTextSize(id: TextSize) {
  try {
    localStorage.setItem(TEXT_SIZE_KEY, id);
  } catch {
    /* not remembered on this device */
  }
  document.documentElement.style.fontSize = `${textSizePx(id)}px`;
}

/** Runs before the app draws, so the page does not jump to another size. */
export const TEXT_SIZE_BOOT = `try{var s=localStorage.getItem('${TEXT_SIZE_KEY}');var p={groot:18,extra:20}[s];if(p)document.documentElement.style.fontSize=p+'px'}catch(e){}`;
