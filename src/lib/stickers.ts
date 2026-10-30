import type { RitiExpression } from "@/lib/riti";

/** Riti stickers for the chats: an expression of Riti plus a short text. */
export const STICKERS = [
  { id: "hoi", expression: "blij", text: "Hoi!" },
  { id: "knuffel", expression: "troostend", text: "Knuffel!" },
  { id: "trots", expression: "trots", text: "Trots op je!" },
  { id: "denken", expression: "denkend", text: "Hmm…" },
  { id: "dankje", expression: "blij", text: "Dankjewel!" },
  { id: "sterkte", expression: "troostend", text: "Sterkte" },
  { id: "toppie", expression: "trots", text: "Toppie!" },
  { id: "welterusten", expression: "neutraal", text: "Welterusten" },
] as const satisfies readonly { id: string; expression: RitiExpression; text: string }[];
export type StickerId = (typeof STICKERS)[number]["id"];
export const stickerById = (id: string | null | undefined) =>
  STICKERS.find((s) => s.id === id) ?? null;
/** Message text that goes with a sticker (shown in pushes and the inbox). */
export const stickerBody = (id: StickerId) => `🧸 ${stickerById(id)!.text}`;
