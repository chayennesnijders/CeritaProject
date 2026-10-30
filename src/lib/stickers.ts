/**
 * Riti stickers for the chats: the whole Riti (the emotion drawings are cut off at the edges) with
 * an emoji that says what the sticker means, and a short text.
 */
export const STICKERS = [
  { id: "hoi", badge: "👋", text: "Hoi!" },
  { id: "knuffel", badge: "🤗", text: "Knuffel!" },
  { id: "trots", badge: "⭐", text: "Trots op je!" },
  { id: "denken", badge: "💭", text: "Hmm…" },
  { id: "dankje", badge: "💖", text: "Dankjewel!" },
  { id: "sterkte", badge: "💪", text: "Sterkte" },
  { id: "toppie", badge: "👍", text: "Toppie!" },
  { id: "welterusten", badge: "🌙", text: "Welterusten" },
] as const;
export type StickerId = (typeof STICKERS)[number]["id"];
export const stickerById = (id: string | null | undefined) =>
  STICKERS.find((s) => s.id === id) ?? null;
/** Message text that goes with a sticker (shown in pushes and the inbox). */
export const stickerBody = (id: StickerId) => `🧸 ${stickerById(id)!.text}`;
