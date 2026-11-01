import type { RitiExpression } from "@/lib/riti";

/**
 * Riti stickers for the chats: a whole Riti sticker drawing with her expression, and a short text.
 * The ids are stored with messages, so existing ids stay the same.
 */
export const STICKERS = [
  { id: "hoi", face: "blij", text: "Hoi!" },
  { id: "knuffel", face: "troostend", text: "Knuffel!" },
  { id: "trots", face: "trots", text: "Trots op je!" },
  { id: "denken", face: "denkend", text: "Hmm…" },
  { id: "dankje", face: "blij", text: "Dankjewel!" },
  { id: "sterkte", face: "troostend", text: "Sterkte" },
  { id: "toppie", face: "trots", text: "Toppie!" },
  { id: "welterusten", face: "neutraal", text: "Welterusten" },
  { id: "verdrietig", face: "verdrietig", text: "Ik ben verdrietig" },
  { id: "boos", face: "boos", text: "Grrr…" },
] as const satisfies readonly { id: string; face: RitiExpression; text: string }[];
export type StickerId = (typeof STICKERS)[number]["id"];
export const stickerById = (id: string | null | undefined) =>
  STICKERS.find((s) => s.id === id) ?? null;
/** Message text that goes with a sticker (shown in pushes and the inbox). */
export const stickerBody = (id: StickerId) => `🧸 ${stickerById(id)!.text}`;
