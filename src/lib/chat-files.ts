import { supabase } from "@/integrations/supabase/client";

/** What the chat-files bucket accepts (kept in sync with migration 0051). */
export const CHAT_FILE_ACCEPT =
  "image/*,video/mp4,video/quicktime,video/webm,application/pdf,text/plain,.doc,.docx,.xls,.xlsx,.ppt,.pptx";
export const CHAT_FILE_MAX_BYTES = 20 * 1024 * 1024;

export type ChatAttachmentKind = "image" | "video" | "file";
export function attachmentKind(type: string | null | undefined): ChatAttachmentKind {
  if (type?.startsWith("image/")) return "image";
  if (type?.startsWith("video/")) return "video";
  return "file";
}

/** A drawing made in the chat is sent as a PNG with this name. */
export const DRAWING_FILE_NAME = "tekening.png";
export const isDrawing = (name: string | null | undefined) => name === DRAWING_FILE_NAME;

/** Text shown (and used in pushes) when a message has only an attachment. */
export function attachmentLabel(type: string | null | undefined, name?: string | null) {
  if (isDrawing(name)) return "🎨 Tekening";
  const kind = attachmentKind(type);
  return kind === "image" ? "📷 Foto" : kind === "video" ? "🎬 Filmpje" : "📎 Bestand";
}

/** Storage path: "<uid>/<dm|group>/<id>/<random>.<ext>"; the extension is cleaned so odd names can't break the path. */
export function chatFilePath(
  uid: string,
  kind: "dm" | "group",
  id: string,
  fileId: string,
  fileName: string,
) {
  const ext = (/\.([A-Za-z0-9]{1,8})$/.exec(fileName)?.[1] ?? "bin").toLowerCase();
  return `${uid}/${kind}/${id}/${fileId}.${ext}`;
}

export async function uploadChatFile(file: File, uid: string, kind: "dm" | "group", id: string) {
  if (file.size > CHAT_FILE_MAX_BYTES) throw new Error("Dit bestand is te groot (max. 20 MB).");
  const path = chatFilePath(uid, kind, id, crypto.randomUUID(), file.name);
  const { error } = await supabase.storage
    .from("chat-files")
    .upload(path, file, file.type ? { contentType: file.type } : {});
  if (error)
    throw new Error(
      error.message.includes("mime") ? "Dit soort bestand kun je niet versturen." : error.message,
    );
  return {
    attachment_path: path,
    attachment_name: file.name.slice(0, 200),
    attachment_type: file.type || null,
  };
}
