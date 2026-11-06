import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { bankPhotos, isDuplicate, type BankPhoto, type BankRow } from "@/lib/photo-bank";
import { fingerprintBlob } from "@/lib/photo-dedupe";

export type BankPhotoWithSrc = BankPhoto & { src: string };
export const PHOTO_BANK_KEY = ["story-photo-bank"] as const;

/** The story photo bank with viewable links (admins only). `rows` is false when update 54 is missing. */
export function usePhotoBank(enabled = true) {
  return useQuery({
    queryKey: PHOTO_BANK_KEY,
    enabled,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const [rows, stories] = await Promise.all([
        supabase.from("story_photos").select("path, hash, hidden, created_at"),
        supabase.from("articles").select("image_url, body, is_published").eq("kind", "verhaal"),
      ]);
      const list = bankPhotos((rows.data ?? []) as BankRow[], stories.data ?? []);
      const signed = list.length
        ? ((await supabase.storage.from("article-images").createSignedUrls(list.map((p) => p.path), 3600)).data ?? [])
        : [];
      const url = new Map(signed.map((x) => [x.path, x.signedUrl]));
      return {
        installed: !rows.error,
        rows: (rows.data ?? []) as BankRow[],
        photos: list
          .map((p) => ({ ...p, src: url.get(p.path) }))
          .filter((p): p is BankPhotoWithSrc => !!p.src),
      };
    },
  });
}

/**
 * Add an already shrunk photo to the bank: skipped (returns "dubbel") when the same photo is in the
 * bank already, otherwise uploaded to fotobank/ and remembered with its fingerprint.
 */
export async function addToBank(
  file: Blob,
  known: (string | null)[],
): Promise<{ status: "toegevoegd"; path: string; hash: string | null } | { status: "dubbel" } | { status: "fout"; error: string }> {
  const hash = await fingerprintBlob(file);
  if (hash && isDuplicate(hash, known)) return { status: "dubbel" };
  const path = `fotobank/${crypto.randomUUID()}.${file.type === "image/png" ? "png" : "jpg"}`;
  const up = await supabase.storage.from("article-images").upload(path, file, { contentType: file.type || "image/jpeg" });
  if (up.error) return { status: "fout", error: up.error.message };
  const { error } = await supabase.from("story_photos").insert({ path, hash });
  if (error) return { status: "fout", error: error.message };
  return { status: "toegevoegd", path, hash };
}

/** Remember a story photo that was uploaded elsewhere (e.g. while planning), so it lands in the bank. */
export async function rememberInBank(path: string, file: Blob) {
  const hash = await fingerprintBlob(file);
  await supabase.from("story_photos").upsert({ path, hash }, { onConflict: "path", ignoreDuplicates: true });
}

export function useRefreshPhotoBank() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: PHOTO_BANK_KEY });
}
