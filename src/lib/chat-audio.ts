import { supabase } from "@/integrations/supabase/client";

export function chatAudioPath(uid: string, kind: "dm" | "group", id: string, fileId: string) {
  return `${uid}/${kind}/${id}/${fileId}.wav`;
}

export async function uploadChatAudio(file: File, uid: string, kind: "dm" | "group", id: string) {
  const path = chatAudioPath(uid, kind, id, crypto.randomUUID());
  const { error } = await supabase.storage.from("chat-audio").upload(path, file, { contentType: "audio/wav" });
  if (error) throw error;
  return path;
}