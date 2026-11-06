/** What the inbox shows under a conversation: a short line about its last message. */
export type LastMessage = {
  sender_id: string;
  body: string | null;
  sticker?: string | null;
  audio_path?: string | null;
  attachment_path?: string | null;
  attachment_type?: string | null;
  game_id?: string | null;
};

export function messagePreview(m: LastMessage | null | undefined, uid: string, max = 60): string {
  if (!m) return "Zeg hallo 👋";
  const mine = m.sender_id === uid ? "Jij: " : "";
  let text: string;
  if (m.audio_path) text = "🎤 Spraakbericht";
  else if (m.game_id) text = `🎮 ${(m.body ?? "").trim() || "Spelletje"}`;
  else if (m.sticker) text = "🧸 Sticker";
  else if (m.attachment_path)
    text = m.attachment_type?.startsWith("image/") ? "📷 Foto" : "📎 Bestand";
  else text = (m.body ?? "").replace(/\s+/g, " ").trim() || "Bericht";
  const full = mine + text;
  return full.length > max ? `${full.slice(0, max - 1).trimEnd()}…` : full;
}
