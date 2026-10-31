import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { copyOutsidePhotos, countOutsidePhotos } from "@/lib/outside-photos.functions";
import { Button } from "@/components/ui/button";

/**
 * Beheer → Livegang: are there story photos still on WordPress? One button copies them into the
 * app's own storage, so the WordPress site can be closed without losing photos.
 */
export function OutsidePhotos() {
  const qc = useQueryClient();
  const count = useServerFn(countOutsidePhotos);
  const copy = useServerFn(copyOutsidePhotos);
  const { data, isLoading, error } = useQuery({
    queryKey: ["outside-photos"],
    queryFn: () => count(),
  });
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);

  async function run() {
    setBusy(true);
    setProgress(0);
    setFailed([]);
    const skip: string[] = [];
    const notCopied: string[] = [];
    let total = 0;
    try {
      for (;;) {
        const r = await copy({ data: { skip } });
        skip.push(...r.tried);
        notCopied.push(...r.failed);
        total += r.copied;
        setProgress(total);
        if (r.left === 0 || r.tried.length === 0) break;
      }
      setFailed(notCopied);
      toast.success(
        notCopied.length
          ? `${total} foto's gekopieerd. Een paar lukten niet.`
          : `Klaar! ${total} foto's staan nu in de app 🎉`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kopiëren lukte niet");
    }
    setBusy(false);
    qc.invalidateQueries({ queryKey: ["outside-photos"] });
  }

  const none = data && data.photos === 0;
  return (
    <section className="space-y-2 rounded-3xl bg-card p-4 shadow-soft">
      <h2 className="text-lg">🖼️ Foto's van WordPress</h2>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Even tellen…</p>
      ) : error ? (
        <p className="text-sm text-destructive">Tellen lukte niet. Probeer het later opnieuw.</p>
      ) : none ? (
        <p className="rounded-2xl bg-[#d8f3dc] p-3 text-sm text-[#1b4332]">
          ✅ Alle foto's van de verhalen staan in de app zelf. WordPress is voor de app niet meer
          nodig.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {data?.photos} foto's in {data?.stories} verhalen staan nog op WordPress. Kopieer ze
            naar de app, dan kan WordPress daarna weg zonder dat er foto's verdwijnen.
          </p>
          <Button disabled={busy} onClick={run} className="w-full rounded-full">
            {busy ? `Bezig… ${progress} gekopieerd` : "Kopieer de foto's naar de app"}
          </Button>
        </>
      )}
      {failed.length > 0 && (
        <p className="text-xs text-destructive">
          Niet gelukt bij: {failed.join(", ")}. Staat de WordPress-site nog aan? Probeer het later
          nog eens, of zet de foto opnieuw bij het verhaal.
        </p>
      )}
    </section>
  );
}
