import { samePhoto } from "@/lib/photo-dedupe";

/**
 * The photo bank for stories: photos admins add once (Beheer → Verhalen → Fotobank) and reuse as
 * the banner of new stories. Photos already used by stories are part of it too. Duplicates (same
 * look, different file) are skipped when adding and can be cleared out.
 */
/** hidden: cleared out as a duplicate, but a story still points to the file, so it stays stored. */
export type BankRow = { path: string; hash: string | null; created_at: string; hidden?: boolean };
export type StoryRef = { image_url: string | null; body: string; is_published: boolean };
export type BankPhoto = BankRow & { inUse: boolean; referenced: boolean };

const isUrl = (p: string) => /^https?:\/\//.test(p);
const photosInText = (body: string) => [...body.matchAll(/\[\[foto:([^\]]+)\]\]/g)].map((m) => m[1]!.trim());

/** Every path a story points to (banner or photo in the text): those files must never be deleted. */
export function referencedPaths(stories: StoryRef[]): Set<string> {
  const out = new Set<string>();
  for (const s of stories) for (const p of [s.image_url, ...photosInText(s.body)]) if (p) out.add(p);
  return out;
}

/**
 * The whole bank: the rows of story_photos plus story photos that are not in it yet (stored files
 * only). `inUse` = banner of a story that is live or planned; free photos come first, newest first.
 */
export function bankPhotos(rows: BankRow[], stories: StoryRef[]): BankPhoto[] {
  const banners = new Set(stories.filter((s) => s.is_published && s.image_url).map((s) => s.image_url!));
  const referenced = referencedPaths(stories);
  const byPath = new Map<string, BankRow>();
  for (const r of rows) byPath.set(r.path, r);
  for (const p of referenced) if (!isUrl(p) && !byPath.has(p)) byPath.set(p, { path: p, hash: null, created_at: "" });
  return [...byPath.values()]
    .filter((r) => !r.hidden)
    .map((r) => ({ ...r, inUse: banners.has(r.path), referenced: referenced.has(r.path) }))
    .sort((a, b) => Number(a.inUse) - Number(b.inUse) || b.created_at.localeCompare(a.created_at));
}

/** Is this new photo already in the bank (or earlier in the same batch)? */
export const isDuplicate = (hash: string, known: (string | null)[]) => known.some((h) => !!h && samePhoto(h, hash));

/**
 * Which copies to clear out: of each group of same-looking photos one stays (in use first, then
 * used by any story, then the oldest). The others leave the bank; their file is only deleted when
 * no story points to it.
 */
export function duplicatesToRemove(photos: BankPhoto[]): { path: string; deleteFile: boolean }[] {
  const order = [...photos]
    .filter((p) => p.hash)
    .sort(
      (a, b) =>
        Number(b.inUse) - Number(a.inUse) ||
        Number(b.referenced) - Number(a.referenced) ||
        (a.created_at || "0").localeCompare(b.created_at || "0"),
    );
  const kept: string[] = [];
  const out: { path: string; deleteFile: boolean }[] = [];
  for (const p of order) {
    if (kept.some((h) => samePhoto(h, p.hash!))) out.push({ path: p.path, deleteFile: !p.referenced });
    else kept.push(p.hash!);
  }
  return out;
}
