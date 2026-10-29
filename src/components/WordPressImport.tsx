import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { importWordPressPage } from "@/lib/wordpress.functions";

/** Beheer: copy all stories (with photos) from the WordPress site into Ontdekken. Safe to run again. */
export function WordPressImport() {
  const qc = useQueryClient();
  const importPage = useServerFn(importWordPressPage);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ added: number; updated: number } | null>(null);

  async function run() {
    setBusy(true);
    setResult(null);
    let added = 0,
      updated = 0,
      done = 0;
    try {
      for (let page = 1; ; page++) {
        const r = await importPage({ data: { page } });
        for (const s of r.imported) {
          if (s.isNew) added++;
          else updated++;
        }
        done += r.imported.length;
        setProgress({ done, total: Math.max(r.total, done) });
        if (r.done) break;
      }
      setResult({ added, updated });
      toast.success(`${added + updated} verhalen staan in de app! 📚`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ophalen lukte niet.");
      if (added + updated) setResult({ added, updated });
    } finally {
      setBusy(false);
      qc.invalidateQueries({ queryKey: ["articles"] });
    }
  }

  return (
    <div className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
      <h2 className="text-lg">Verhalen van WordPress</h2>
      <p className="text-sm text-muted-foreground">
        Haal alle verhalen van je WordPress-site op, met de foto's erbij. Ze komen bij Ontdekken.
        Nieuwe verhalen op WordPress? Druk gewoon nog een keer: er komt niks dubbel.
      </p>
      <Button onClick={run} disabled={busy} className="w-full rounded-full">
        {busy ? "Bezig met ophalen…" : "📥 Verhalen ophalen van WordPress"}
      </Button>
      {progress && (
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {progress.done} van {progress.total || "?"} verhalen
          </p>
        </div>
      )}
      {result && (
        <p className="text-sm">
          ✅ {result.added} nieuw, {result.updated} bijgewerkt.
        </p>
      )}
    </div>
  );
}
