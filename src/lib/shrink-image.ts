/**
 * Phone photos are often 3–8 MB. Before uploading, photos are scaled down and
 * saved as JPEG, so sending and opening them is quick. Drawings, GIFs and
 * photos that are already small are sent as they are.
 */

/** Width and height after fitting the longest side within `max` (never enlarged). */
export function fitWithin(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** Whether a file is worth shrinking. */
export function shouldShrink(file: { type: string; size: number; name: string }, minBytes = 400_000) {
  if (!file.type.startsWith("image/")) return false;
  if (file.type === "image/gif" || file.type === "image/svg+xml") return false;
  if (file.name === "tekening.png") return false;
  return file.size > minBytes;
}

export async function shrinkImage(file: File, max = 1600, quality = 0.82): Promise<File> {
  if (!shouldShrink(file) || typeof createImageBitmap === "undefined") return file;
  try {
    // "from-image" keeps phone photos the right way up.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const { width, height } = fitWithin(bitmap.width, bitmap.height, max);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#fff"; // transparent PNGs get a white background as JPEG
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    // A format the browser can't read (for example some HEIC photos): send the original.
    return file;
  }
}
