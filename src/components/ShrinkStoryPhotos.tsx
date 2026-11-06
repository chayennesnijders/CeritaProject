import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { shrinkImage } from "@/lib/shrink-image";

/**
 * Story and article banners were uploaded at full size (often several MB),
 * which makes Ontdekken slow. This makes a smaller copy of each big banner and
 * points the story at it. The original file stays in storage.
 */
export function ShrinkStoryPhotos() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setLog("Foto's bekijken…");
    let done = 0;
    let saved = 0;
    let failed = 0;
    try {
      const { data: rows, error } = await supabase
        .from("articles")
        .select("id, image_url")
        .not("image_url", "is", null);
      if (error) throw error;
      const list = (rows ?? []).filter((r) => r.image_url && !/^https?:\/\//.test(r.image_url));
      for (const [i, r] of list.entries()) {
        setLog(`Bezig: ${i + 1} van ${list.length}…`);
        try {
          const { data: blob, error: dErr } = await supabase.storage.from("article-images").download(r.image_url!);
          if (dErr || !blob || blob.size <= 400_000) continue;
          const name = r.image_url!.split("/").pop() ?? "foto.jpg";
          const small = await shrinkImage(new File([blob], name, { type: blob.type || "image/jpeg" }), 1280);
          if (small.size >= blob.size) continue;
          const path = `verhalen/klein-${crypto.randomUUID()}.jpg`;
          const { error: upErr } = await supabase.storage
            .from("article-images")
            .upload(path, small, { contentType: "image/jpeg" });
          if (upErr) throw upErr;
          const { error: uErr } = await supabase.from("articles").update({ image_url: path }).eq("id", r.id);
          if (uErr) throw uErr;
          done += 1;
          saved += blob.size - small.size;
        } catch {
          failed += 1;
        }
      }
      setLog(
        done
          ? `Klaar! ${done} foto's verkleind, ${(saved / 1_000_000).toFixed(0)} MB lichter.${failed ? ` ${failed} lukte niet.` : ""}`
          : failed
            ? `${failed} foto's lukten niet. Probeer het later nog eens.`
            : "Alle foto's waren al klein genoeg 👍",
      );
      qc.invalidateQueries();
    } catch (e) {
      setLog(e instanceof Error ? e.message : "Dat lukte niet.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-2 rounded-3xl bg-card p-4 shadow-soft">
      <h2 className="text-lg">🖼️ Verhaalfoto's verkleinen</h2>
      <p className="text-sm text-muted-foreground">
        Grote foto's maken Ontdekken traag. Deze knop maakt van elke grote verhaalfoto een lichtere
        versie. Het duurt een paar minuten; laat dit scherm open.
      </p>
      <button
        onClick={run}
        disabled={busy}
        className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {busy ? "Bezig…" : "Foto's verkleinen"}
      </button>
      {log && <p className="text-sm">{log}</p>}
    </section>
  );
}
