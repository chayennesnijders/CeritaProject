/**
 * Finding photos that look the same, even when they are stored under different names
 * (the same picture was often uploaded more than once). Each photo gets a small "fingerprint":
 * a difference hash of a 9×8 grayscale version. Fingerprints that differ in only a few bits
 * are the same picture, also after resizing or re-saving.
 */

/** 64-bit difference hash from 9×8 grayscale pixel values (row by row), as a 16-character hex string. */
export function dHash(gray: ArrayLike<number>): string {
  let bits = "";
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) bits += gray[y * 9 + x]! > gray[y * 9 + x + 1]! ? "1" : "0";
  let hex = "";
  for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}

/** How many of the 64 bits differ. */
export function hamming(a: string, b: string): number {
  let d = 0;
  for (let i = 0; i < 16; i++) {
    let x = parseInt(a[i]!, 16) ^ parseInt(b[i]!, 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}

/** Two fingerprints this close are the same photo. */
export const SAME_PHOTO = 6;
export const samePhoto = (a: string, b: string) => hamming(a, b) <= SAME_PHOTO;

export type DedupeStory = { id: string; image: string; hash: string };
export type DedupeCandidate = { path: string; hash: string };

/**
 * Which stories keep their photo and which need another one. The first story with a photo keeps
 * it (pass the stories in the order that should win, e.g. published and oldest first); every next
 * story with the same-looking photo gets the next free candidate that looks like no photo in use.
 * Stories for which no free photo is left get null (no photo is better than a duplicate).
 */
export function planDedupe(
  stories: DedupeStory[],
  candidates: DedupeCandidate[],
): { id: string; from: string; to: string | null }[] {
  const used: string[] = [];
  const changes: { id: string; from: string; to: string | null }[] = [];
  const free = [...candidates];
  for (const s of stories) {
    if (!used.some((h) => samePhoto(h, s.hash))) {
      used.push(s.hash);
      continue;
    }
    const i = free.findIndex((c) => !used.some((h) => samePhoto(h, c.hash)));
    if (i === -1) {
      changes.push({ id: s.id, from: s.image, to: null });
      continue;
    }
    const pick = free.splice(i, 1)[0]!;
    used.push(pick.hash);
    changes.push({ id: s.id, from: s.image, to: pick.path });
  }
  return changes;
}

/** The fingerprint of an image file (in the browser), or null when it can't be read. */
export async function fingerprintBlob(blob: Blob): Promise<string | null> {
  try {
    // First to 72×64 with smoothing, then to 9×8: averaging makes the fingerprint stable
    // when the same photo was saved at another size or quality.
    const bitmap = await createImageBitmap(blob, { resizeWidth: 72, resizeHeight: 64, resizeQuality: "high" });
    const canvas = document.createElement("canvas");
    canvas.width = 9;
    canvas.height = 8;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, 9, 8);
    bitmap.close();
    const px = ctx.getImageData(0, 0, 9, 8).data;
    const gray = Array.from({ length: 72 }, (_, i) => px[i * 4]! * 0.299 + px[i * 4 + 1]! * 0.587 + px[i * 4 + 2]! * 0.114);
    return dHash(gray);
  } catch {
    return null;
  }
}
