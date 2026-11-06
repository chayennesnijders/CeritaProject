import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { shrinkImage } from "@/lib/shrink-image";
import { fingerprintBlob, planDedupe, samePhoto, type DedupeCandidate, type DedupeStory } from "@/lib/photo-dedupe";

const BUCKET = "article-images";
type Change = { id: string; title: string; from: string; to: string | null; size: number };

/** The fingerprint of a stored photo, or null when it can't be read. */
async function fingerprint(path: string): Promise<string | null> {
  try {
    const { data: blob } = await supabase.storage.from(BUCKET).download(path);
    return blob ? await fingerprintBlob(blob) : null;
  } catch {
    return null;
  }
}

/** Run `fn` over the items, a few at a time. */
async function pool<T, R>(items: T[], n: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]!, i);
      }
    }),
  );
  return out;
}

/** Every photo file in the story-photo storage (root and the verhalen folder), with its size. */
async function storedPhotos(): Promise<Map<string, number>> {
  const found = new Map<string, number>();
  for (const folder of ["", "verhalen"]) {
    for (let offset = 0; ; offset += 1000) {
      const { data } = await supabase.storage.from(BUCKET).list(folder, { limit: 1000, offset });
      const files = (data ?? []).filter((f) => f.id && /\.(jpe?g|png|webp)$/i.test(f.name));
      for (const f of files)
        found.set(folder ? `${folder}/${f.name}` : f.name, Number((f.metadata as { size?: number } | null)?.size ?? 0));
      if ((data ?? []).length < 1000) break;
    }
  }
  return found;
}

/**
 * Beheer → Verhalen: find stories whose photo looks the same as another story's photo (also when
 * stored under another name) and give each of them a photo no other story uses.
 */
export function DedupeStoryPhotos() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string | null>(null);
  const [plan, setPlan] = useState<Change[] | null>(null);

  async function find() {
    setBusy(true);
    setPlan(null);
    try {
      setLog("Verhalen ophalen…");
      const { data: rows, error } = await supabase
        .from("articles")
        .select("id, title, image_url, body, is_published, created_at")
        .not("image_url", "is", null)
        .order("is_published", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      const stories = (rows ?? []).filter((r) => r.image_url && !/^https?:\/\//.test(r.image_url));
      let done = 0;
      const hashes = await pool(stories, 6, async (s) => {
        const h = await fingerprint(s.image_url!);
        setLog(`Foto's van verhalen bekijken: ${++done} van ${stories.length}…`);
        return h;
      });
      const withHash: DedupeStory[] = stories
        .map((s, i) => ({ id: s.id, image: s.image_url!, hash: hashes[i]! }))
        .filter((s) => s.hash);
      const firstPass = planDedupe(withHash, []);
      if (!firstPass.length) {
        setLog(`Klaar: alle ${withHash.length} verhalen hebben al een eigen foto 👍`);
        return;
      }

      // Free photos: files in storage and photos inside story texts that no story uses as banner.
      setLog(`${firstPass.length} dubbele gevonden. Vrije foto's zoeken…`);
      const sizes = await storedPhotos();
      for (const r of rows ?? [])
        for (const m of (r.body ?? "").matchAll(/\[\[foto:([^\]]+)\]\]/g)) {
          const p = m[1]!.trim();
          if (!/^https?:\/\//.test(p) && !sizes.has(p)) sizes.set(p, 0);
        }
      const inUse = new Set(stories.map((s) => s.image_url!));
      const free = [...sizes.entries()]
        .filter(([p]) => !inUse.has(p))
        .sort((a, b) => (a[1] || 9e9) - (b[1] || 9e9)); // small (already shrunk) photos first
      const candidates: DedupeCandidate[] = [];
      const taken = withHash.map((s) => s.hash);
      let looked = 0;
      // Fingerprint free photos until there are enough that look different from everything in use.
      for (let i = 0; i < free.length && candidates.filter((c) => !taken.some((h) => samePhoto(h, c.hash))).length < firstPass.length + 3; i += 6) {
        const batch = free.slice(i, i + 6);
        const hs = await pool(batch, 6, ([p]) => fingerprint(p));
        batch.forEach(([p], j) => {
          if (hs[j]) candidates.push({ path: p, hash: hs[j]! });
        });
        looked += batch.length;
        setLog(`Vrije foto's bekijken: ${looked}…`);
      }
      const titles = new Map((rows ?? []).map((r) => [r.id, r.title]));
      const changes = planDedupe(withHash, candidates).map((c) => ({
        ...c,
        title: titles.get(c.id) ?? "",
        size: c.to ? (sizes.get(c.to) ?? 0) : 0,
      }));
      setPlan(changes);
      const none = changes.filter((c) => !c.to).length;
      setLog(
        `${changes.length} verhalen hebben een foto die al bij een ander verhaal staat.` +
          (none ? ` Voor ${none} is geen vrije foto meer; die krijgen geen foto (je kunt er later zelf een kiezen bij Inplannen).` : ""),
      );
    } catch (e) {
      setLog(e instanceof Error ? e.message : "Dat lukte niet.");
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    if (!plan) return;
    setBusy(true);
    let ok = 0;
    let failed = 0;
    for (const [i, c] of plan.entries()) {
      setLog(`Bezig: ${i + 1} van ${plan.length}…`);
      try {
        let path = c.to;
        // A large original is first made smaller, like the other story photos.
        if (path && (c.size === 0 || c.size > 400_000)) {
          const { data: blob } = await supabase.storage.from(BUCKET).download(path);
          if (blob && blob.size > 400_000) {
            const small = await shrinkImage(new File([blob], path.split("/").pop() ?? "foto.jpg", { type: blob.type || "image/jpeg" }), 1280);
            if (small.size < blob.size) {
              const newPath = `verhalen/klein-${crypto.randomUUID()}.jpg`;
              const { error } = await supabase.storage.from(BUCKET).upload(newPath, small, { contentType: "image/jpeg" });
              if (!error) path = newPath;
            }
          }
        }
        const { data, error } = await supabase.from("articles").update({ image_url: path }).eq("id", c.id).select("id");
        if (error || !data?.length) throw error ?? new Error("niet bijgewerkt");
        ok += 1;
      } catch {
        failed += 1;
      }
    }
    setPlan(null);
    setBusy(false);
    setLog(`Klaar! ${ok} verhalen hebben nu een eigen foto.${failed ? ` ${failed} lukte niet, probeer het nog eens.` : ""}`);
    qc.invalidateQueries();
  }

  return (
    <section className="space-y-2 rounded-3xl bg-card p-4 shadow-soft">
      <h2 className="text-lg">🖼️ Dubbele foto's opruimen</h2>
      <p className="text-sm text-muted-foreground">
        Zoekt verhalen met dezelfde foto (ook als die onder een andere naam is opgeslagen) en geeft
        elk verhaal een foto die nergens anders wordt gebruikt. Eerst zie je wat er verandert. Laat
        dit scherm open, het duurt een paar minuten.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={find} disabled={busy} className="rounded-full">
          {busy && !plan ? "Bezig…" : "Zoek dubbele foto's"}
        </Button>
        {plan && plan.length > 0 && (
          <Button onClick={apply} disabled={busy} variant="secondary" className="rounded-full">
            {busy ? "Bezig…" : `Vervang ${plan.length} foto's`}
          </Button>
        )}
      </div>
      {log && <p className="text-sm">{log}</p>}
      {plan && plan.length > 0 && (
        <ul className="max-h-60 space-y-1 overflow-y-auto rounded-2xl bg-muted p-3 text-xs">
          {plan.map((c) => (
            <li key={c.id}>
              {c.to ? "🔁" : "➖"} {c.title}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
