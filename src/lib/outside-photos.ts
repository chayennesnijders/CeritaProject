/**
 * Photos in stories that still live on another website (WordPress) instead of in the app's own
 * article-images storage. Once these are copied, the WordPress site can be closed.
 */
export type ArticlePhotos = { id: string; title: string; image_url: string | null; body: string };

const isWeb = (s: string | null | undefined): s is string => !!s && /^https?:\/\//i.test(s.trim());

/** All web addresses used as cover or as a photo between the text, without duplicates. */
export function outsidePhotos(a: ArticlePhotos): string[] {
  const inBody = [...a.body.matchAll(/\[\[foto:(.+?)\]\]/g)].map((m) => m[1]!.trim());
  return [...new Set([a.image_url?.trim(), ...inBody].filter(isWeb))];
}

/** File extension for a photo address (query strings like ?resize=… are ignored). */
export function photoExtension(url: string, contentType?: string | null) {
  const fromType = /image\/(jpeg|jpg|png|gif|webp|avif)/i.exec(contentType ?? "")?.[1];
  if (fromType) return fromType.toLowerCase() === "jpeg" ? "jpg" : fromType.toLowerCase();
  const fromUrl = /\.(jpe?g|png|gif|webp|avif)(?:$|\?)/i.exec(url.split("#")[0]!)?.[1];
  return (fromUrl ?? "jpg").toLowerCase().replace("jpeg", "jpg");
}

/** Put the stored paths in place of the web addresses (cover and photos between the text). */
export function swapPhotos(a: ArticlePhotos, stored: Record<string, string>) {
  const body = a.body.replace(/\[\[foto:(.+?)\]\]/g, (all, url: string) =>
    stored[url.trim()] ? `[[foto:${stored[url.trim()]}]]` : all,
  );
  const cover =
    a.image_url && stored[a.image_url.trim()] ? stored[a.image_url.trim()]! : a.image_url;
  return { body, image_url: cover };
}

/**
 * Addresses to try for a photo: as it is, and for the WordPress image service (i0.wp.com/…) also the
 * original file without resizing.
 */
export function photoSources(url: string): string[] {
  const out = [url];
  const m = /^https?:\/\/i\d\.wp\.com\/(.+?)(?:\?.*)?$/i.exec(url);
  if (m) out.push(`https://${m[1]}`);
  else if (url.includes("?")) out.push(url.split("?")[0]!);
  return out;
}
