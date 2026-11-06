import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { shrinkImage } from "@/lib/shrink-image";
import { fingerprintBlob } from "@/lib/photo-dedupe";
import { duplicatesToRemove, type BankPhoto } from "@/lib/photo-bank";
import { addToBank, usePhotoBank, useRefreshPhotoBank, type BankPhotoWithSrc } from "@/lib/use-photo-bank";
import { celebrate } from "@/lib/celebrate";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PAGE = 24;

/**
 * Beheer → Verhalen → Fotobank: add photos once, reuse them as the banner of new stories.
 * Duplicates are skipped when adding, and "Dubbele eruit halen" clears out copies already there.
 */
export function StoryPhotoBank() {
  const { data, isLoading } = usePhotoBank();
  const refresh = useRefreshPhotoBank();
  const [busy, setBusy] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [plan, setPlan] = useState<{ path: string; deleteFile: boolean }[] | null>(null);
  const [removing, setRemoving] = useState<BankPhotoWithSrc | null>(null);

  if (isLoading) return <p className="text-sm text-muted-foreground">Fotobank laden…</p>;
  if (!data?.installed)
    return (
      <section className="rounded-3xl bg-card p-4 text-sm shadow-soft">
        🖼️ De fotobank is nog niet geïnstalleerd. Plak <b>supabase/update-54-fotobank.sql</b> in Supabase → SQL
        Editor en klik Run.
      </section>
    );
  const photos = data.photos;
  const free = photos.filter((p) => !p.inUse).length;

  async function add(files: FileList) {
    const known = data!.rows.map((r) => r.hash);
    let added = 0;
    let doubles = 0;
    let failed = 0;
    const list = [...files];
    for (const [i, f] of list.entries()) {
      setBusy(`Foto ${i + 1} van ${list.length} toevoegen…`);
      const small = await shrinkImage(f, 1600);
      const r = await addToBank(small, known);
      if (r.status === "toegevoegd") {
        added++;
        known.push(r.hash);
      } else if (r.status === "dubbel") doubles++;
      else {
        failed++;
        toast.error(`${f.name}: ${r.error}`);
      }
    }
    setBusy(null);
    await refresh();
    if (added) celebrate("klein", { set: "hartjes" });
    toast.success(
      [
        added ? `${added} ${added === 1 ? "foto" : "foto's"} toegevoegd` : null,
        doubles ? `${doubles} dubbel overgeslagen` : null,
        failed ? `${failed} mislukt` : null,
      ]
        .filter(Boolean)
        .join(" · ") || "Niets toegevoegd",
    );
  }

  /** Fingerprint photos that have none yet (old story photos), then work out which copies can go. */
  async function findDoubles() {
    const todo = photos.filter((p) => !p.hash);
    const hashed: BankPhoto[] = photos.filter((p) => p.hash);
    for (const [i, p] of todo.entries()) {
      setBusy(`Foto's vergelijken… ${i + 1} van ${todo.length}`);
      try {
        const blob = await (await fetch(p.src)).blob();
        const hash = await fingerprintBlob(blob);
        if (!hash) continue;
        await supabase.from("story_photos").upsert({ path: p.path, hash }, { onConflict: "path" });
        hashed.push({ ...p, hash });
      } catch {
        // A photo that can't be read is left alone.
      }
    }
    setBusy(null);
    await refresh();
    const remove = duplicatesToRemove(hashed);
    if (!remove.length) {
      toast.success("Geen dubbele foto's gevonden 🎉");
      return;
    }
    setPlan(remove);
  }

  async function clearDoubles(remove: { path: string; deleteFile: boolean }[]) {
    setBusy("Dubbele foto's opruimen…");
    const files = remove.filter((r) => r.deleteFile).map((r) => r.path);
    const keepFile = remove.filter((r) => !r.deleteFile).map((r) => r.path);
    // Copies a story still points to stay stored, but leave the bank.
    if (keepFile.length)
      await supabase.from("story_photos").upsert(keepFile.map((path) => ({ path, hidden: true })), { onConflict: "path" });
    if (files.length) {
      await supabase.storage.from("article-images").remove(files);
      await supabase.from("story_photos").delete().in("path", files);
    }
    setBusy(null);
    setPlan(null);
    await refresh();
    toast.success(`${remove.length} dubbele ${remove.length === 1 ? "foto" : "foto's"} eruit gehaald`);
  }

  async function removeOne(p: BankPhotoWithSrc) {
    setRemoving(null);
    if (p.referenced) {
      await supabase.from("story_photos").upsert({ path: p.path, hidden: true }, { onConflict: "path" });
    } else {
      await supabase.storage.from("article-images").remove([p.path]);
      await supabase.from("story_photos").delete().eq("path", p.path);
    }
    await refresh();
    toast.success("Foto uit de fotobank gehaald");
  }

  return (
    <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl">🖼️ Fotobank</h2>
          <p className="text-sm text-muted-foreground">
            {photos.length} foto's · {free} nog vrij. Voeg foto's toe en kies ze later bij een nieuw verhaal.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <label className={`cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground ${busy ? "pointer-events-none opacity-60" : ""}`}>
          ➕ Foto's toevoegen
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) void add(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <button
          disabled={!!busy || photos.length < 2}
          onClick={() => void findDoubles()}
          className="rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground disabled:opacity-50"
        >
          🧹 Dubbele eruit halen
        </button>
      </div>
      {busy && <p className="text-sm font-semibold text-primary" role="status">⏳ {busy}</p>}
      <p className="text-xs text-muted-foreground">
        Dubbele foto's worden bij het toevoegen vanzelf overgeslagen. 👁️ = staat bij een verhaal dat live of ingepland
        is.
      </p>

      {photos.length === 0 ? (
        <p className="rounded-2xl bg-muted p-4 text-center text-sm text-muted-foreground">
          Nog geen foto's. Tik op ‘Foto's toevoegen’ en kies er meteen een paar tegelijk.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-1.5">
            {photos.slice(0, shown).map((p) => (
              <div key={p.path} className="group relative overflow-hidden rounded-lg">
                <img src={p.src} alt="" loading="lazy" className="aspect-[3/2] w-full object-cover" />
                {p.inUse ? (
                  <span className="absolute right-1 top-1 rounded-full bg-black/60 px-1 text-[10px] text-white">👁️</span>
                ) : (
                  <button
                    onClick={() => setRemoving(p)}
                    aria-label="Foto uit de fotobank halen"
                    className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-xs text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {photos.length > shown && (
            <button onClick={() => setShown((n) => n + PAGE)} className="w-full rounded-full border py-2 text-sm font-semibold">
              Meer tonen ({photos.length - shown})
            </button>
          )}
        </>
      )}

      <AlertDialog open={!!plan} onOpenChange={(o) => !o && setPlan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {plan?.length} dubbele {plan?.length === 1 ? "foto" : "foto's"} gevonden
            </AlertDialogTitle>
            <AlertDialogDescription>
              Van elke foto blijft er één over (de foto die bij een live verhaal staat gaat voor). Foto's die nog bij
              een verhaal horen, blijven bewaard maar verdwijnen uit de fotobank. Verhalen veranderen niet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={() => plan && void clearDoubles(plan)}>Eruit halen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Foto uit de fotobank halen?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing?.referenced
                ? "Deze foto hoort bij een verhaal dat nog niet live is. Hij blijft bij dat verhaal, maar staat niet meer in de fotobank."
                : "De foto wordt verwijderd. Dit kan niet ongedaan worden."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {removing && <img src={removing.src} alt="" className="aspect-[3/2] w-full rounded-xl object-cover" />}
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={() => removing && void removeOne(removing)}>Weghalen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

/** Pick a photo from the bank (for a new or planned story). */
export function PhotoBankPicker({ chosen, onPick }: { chosen: string | null; onPick: (path: string, src: string) => void }) {
  const { data } = usePhotoBank();
  if (!data) return <p className="text-xs text-muted-foreground">Foto's laden…</p>;
  if (!data.photos.length) return <p className="text-xs text-muted-foreground">De fotobank is nog leeg.</p>;
  return (
    <div className="space-y-1">
      <p className="text-[11px] text-muted-foreground">
        Tik op een foto. Foto's met 👁️ staan al bij een verhaal dat live of ingepland is.
      </p>
      <div className="grid max-h-72 grid-cols-3 gap-1.5 overflow-y-auto">
        {data.photos.map((b) => (
          <button
            key={b.path}
            type="button"
            onClick={() => onPick(b.path, b.src)}
            className={`relative overflow-hidden rounded-lg ${chosen === b.path ? "ring-2 ring-primary" : ""}`}
          >
            <img src={b.src} alt="" loading="lazy" className="aspect-[3/2] w-full object-cover" />
            {b.inUse && <span className="absolute right-1 top-1 rounded-full bg-black/60 px-1 text-[10px]">👁️</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
