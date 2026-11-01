import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ARTICLE_CATEGORIES, categoryLabel, type ArticleCategory } from "@/lib/articles";
import { parseStories, type ImportedStory } from "@/lib/story-import";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Beheer → Verhalen: paste stories from your notes. Check them, change category or age, then add
 * them all at once (hidden at first, so you can still read them through before members see them).
 */
export function StoryImport() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [stories, setStories] = useState<ImportedStory[] | null>(null);
  const [publish, setPublish] = useState(false);
  const [busy, setBusy] = useState(false);

  async function check() {
    const parsed = parseStories(raw);
    if (!parsed.length) {
      toast.error("Geen verhalen gevonden. Zet een regel met --- tussen de verhalen.");
      return;
    }
    // Stories that are already in the app (same title) are left out.
    const { data } = await supabase.from("articles").select("title");
    const have = new Set((data ?? []).map((a) => a.title.trim().toLowerCase()));
    const fresh = parsed.filter((s) => !have.has(s.title.toLowerCase()));
    if (fresh.length < parsed.length)
      toast(
        `${parsed.length - fresh.length} verhaal/verhalen stond(en) er al in en worden overgeslagen.`,
      );
    setStories(fresh);
  }
  const change = (i: number, patch: Partial<ImportedStory>) =>
    setStories((list) => list?.map((s, j) => (j === i ? { ...s, ...patch } : s)) ?? null);

  async function add() {
    if (!stories?.length) return;
    setBusy(true);
    const { error } = await supabase.from("articles").insert(
      stories.map((s) => ({
        title: s.title,
        body: s.body,
        emoji: "📖",
        category: s.category,
        min_age: s.minAge,
        kind: "verhaal",
        is_published: publish,
      })),
    );
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      publish
        ? `${stories.length} verhalen staan in de app 🎉`
        : `${stories.length} verhalen toegevoegd (nog verborgen). Zet ze hieronder één voor één aan.`,
    );
    setStories(null);
    setRaw("");
    qc.invalidateQueries({ queryKey: ["admin-articles"] });
    qc.invalidateQueries({ queryKey: ["articles"] });
  }

  if (!open)
    return (
      <Button variant="outline" className="w-full rounded-full" onClick={() => setOpen(true)}>
        📋 Verhalen plakken uit je notities
      </Button>
    );

  return (
    <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <h2 className="text-lg">📋 Verhalen plakken</h2>
        <button onClick={() => setOpen(false)} className="text-sm underline">
          Sluiten
        </button>
      </div>
      {!stories ? (
        <>
          <div className="rounded-2xl bg-muted p-3 text-xs leading-relaxed">
            <p className="font-semibold">Zo zet je ze klaar in je notitie:</p>
            <p>• De eerste regel van een verhaal is de titel.</p>
            <p>
              • Zet tussen twee verhalen een regel met alleen <strong>---</strong>
            </p>
            <p>
              • Mag erbij: een regel <strong>Leeftijd: 16+</strong> of{" "}
              <strong>Categorie: Relaties</strong>
            </p>
            <p className="mt-1 text-muted-foreground">
              Je kunt er zoveel tegelijk plakken als je wilt.
            </p>
          </div>
          <Textarea
            id="story-import"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={10}
            placeholder={
              "Mijn eerste schooldag\nIk was zo zenuwachtig…\n---\nToen alles anders werd\nLeeftijd: 16+\nHet begon op een dinsdag…"
            }
            className="rounded-2xl font-mono text-xs"
          />
          <Button disabled={!raw.trim()} onClick={check} className="w-full rounded-full">
            Bekijk de verhalen
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold">{stories.length} verhalen gevonden. Klopt alles?</p>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {stories.map((s, i) => (
              <div key={i} className="space-y-1.5 rounded-2xl bg-muted p-3 text-sm">
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1 font-semibold">{s.title}</p>
                  <button
                    className="shrink-0 text-xs underline"
                    onClick={() => setStories(stories.filter((_, j) => j !== i))}
                  >
                    Weglaten
                  </button>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{s.body}</p>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={s.category}
                    onChange={(e) => change(i, { category: e.target.value as ArticleCategory })}
                    className="h-8 rounded-full border border-input bg-background px-2 text-xs"
                  >
                    {ARTICLE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {categoryLabel(c)}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => change(i, { minAge: s.minAge === 16 ? 12 : 16 })}
                    className={`h-8 rounded-full px-3 text-xs font-semibold ${s.minAge === 16 ? "bg-primary text-primary-foreground" : "bg-background"}`}
                  >
                    {s.minAge === 16 ? "16+" : "13+"}
                  </button>
                  <span className="self-center text-[11px] text-muted-foreground">
                    {s.body.split(/\s+/).length} woorden
                  </span>
                </div>
              </div>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={publish}
              onChange={(e) => setPublish(e.target.checked)}
              className="size-4"
            />
            Meteen zichtbaar voor leden (anders eerst verborgen)
          </label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => setStories(null)}
            >
              Terug
            </Button>
            <Button
              disabled={busy || !stories.length}
              className="flex-1 rounded-full"
              onClick={add}
            >
              {busy ? "Bezig…" : `${stories.length} toevoegen`}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
