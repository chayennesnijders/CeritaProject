import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ARTICLE_CATEGORIES, categoryLabel, type ArticleCategory } from "@/lib/articles";
import { illustrate, proofread } from "@/lib/story-ai.functions";
import {
  dayKey,
  dutchMoment,
  parseStories,
  planDays,
  type ImportedStory,
} from "@/lib/story-import";
import { celebrate } from "@/lib/celebrate";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/** A story being prepared: its improved text, banner picture and planned day. */
type Item = ImportedStory & {
  original: { title: string; body: string };
  photo?: File | undefined;
  preview?: string | undefined;
  day: string;
  time: string;
  status: "wacht" | "tekst" | "foto" | "klaar" | "fout";
  error?: string | undefined;
  open?: boolean | undefined;
};

const STATUS_TEXT: Record<Item["status"], string> = {
  wacht: "⏳ Wacht…",
  tekst: "✏️ Tekst nakijken…",
  foto: "🖼️ Foto maken…",
  klaar: "✅ Klaar",
  fout: "⚠️ Niet gelukt",
};

/**
 * Beheer → Verhalen: paste one or more stories. The app checks spelling and sentences, makes the
 * text easy to read with paragraphs, adds a banner picture, and plans one story a day. You only
 * check the result and tap "Inplannen".
 */
export function StoryImport() {
  const qc = useQueryClient();
  const runCheck = useServerFn(proofread);
  const runPicture = useServerFn(illustrate);
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [items, setItems] = useState<Item[] | null>(null);
  const [busy, setBusy] = useState(false);

  const patch = (i: number, p: Partial<Item>) =>
    setItems((list) => list?.map((s, j) => (j === i ? { ...s, ...p } : s)) ?? null);

  async function prepareOne(i: number, st: { title: string; body: string }) {
    patch(i, { status: "tekst", error: undefined });
    let text = st;
    try {
      text = await runCheck({ data: st });
      patch(i, { title: text.title, body: text.body });
    } catch (e) {
      patch(i, { status: "fout", error: e instanceof Error ? e.message : "Nakijken lukte niet" });
      return;
    }
    patch(i, { status: "foto" });
    try {
      const { base64 } = await runPicture({ data: text });
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const file = new File([bytes], "banner.jpg", { type: "image/jpeg" });
      patch(i, { photo: file, preview: URL.createObjectURL(file), status: "klaar" });
    } catch (e) {
      // The text is ready; without a picture you can still add one yourself.
      patch(i, {
        status: "klaar",
        error: e instanceof Error ? `Geen foto: ${e.message}` : "Geen foto gemaakt",
      });
    }
  }

  async function prepare() {
    const parsed = parseStories(raw);
    if (!parsed.length) {
      toast.error(
        "Geen verhaal gevonden. Staat de titel op de eerste regel? Zet tussen verhalen een regel met ---",
      );
      return;
    }
    const [{ data: existing }, { data: planned }] = await Promise.all([
      supabase.from("articles").select("title"),
      supabase.from("articles").select("publish_at").gte("publish_at", new Date().toISOString()),
    ]);
    const have = new Set((existing ?? []).map((a) => a.title.trim().toLowerCase()));
    const fresh = parsed.filter((s) => !have.has(s.title.toLowerCase()));
    if (fresh.length < parsed.length)
      toast(`${parsed.length - fresh.length} verhaal stond er al in en wordt overgeslagen.`);
    if (!fresh.length) return;
    const days = planDays(
      fresh.length,
      (planned ?? []).map((p) => dayKey(new Date(p.publish_at))),
    );
    const list: Item[] = fresh.map((s, i) => ({
      ...s,
      original: { title: s.title, body: s.body },
      day: days[i]!,
      time: "08:00",
      status: "wacht",
    }));
    setItems(list);
    for (const [i, s] of list.entries()) await prepareOne(i, s);
  }

  async function newPicture(i: number) {
    const st = items![i]!;
    patch(i, { status: "foto", error: undefined });
    try {
      const { base64 } = await runPicture({ data: { title: st.title, body: st.body } });
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const file = new File([bytes], "banner.jpg", { type: "image/jpeg" });
      patch(i, { photo: file, preview: URL.createObjectURL(file), status: "klaar" });
    } catch (e) {
      patch(i, {
        status: "klaar",
        error: e instanceof Error ? e.message : "Foto maken lukte niet",
      });
    }
  }

  async function plan() {
    if (!items?.length) return;
    setBusy(true);
    let done = 0;
    for (const st of items) {
      let image_url: string | null = null;
      if (st.photo) {
        const path = `verhalen/${crypto.randomUUID()}.${st.photo.type === "image/png" ? "png" : "jpg"}`;
        const up = await supabase.storage
          .from("article-images")
          .upload(path, st.photo, { contentType: st.photo.type });
        if (up.error) {
          toast.error(`Foto bij "${st.title}" uploaden lukte niet: ${up.error.message}`);
          break;
        }
        image_url = path;
      }
      const at = dutchMoment(st.day, st.time);
      const { error } = await supabase.from("articles").insert({
        title: st.title,
        body: st.body,
        emoji: "📖",
        category: st.category,
        min_age: st.minAge,
        kind: "verhaal",
        is_published: true,
        publish_at: at,
        created_at: at,
        image_url,
      });
      if (error) {
        toast.error(`"${st.title}": ${error.message}`);
        break;
      }
      done++;
    }
    setBusy(false);
    if (done) {
      toast.success(done === 1 ? "Ingepland 🎉" : `${done} verhalen ingepland 🎉`);
      celebrate("groot", { set: "hartjes" });
      setItems(done === items.length ? null : items.slice(done));
      if (done === items.length) setRaw("");
      qc.invalidateQueries({ queryKey: ["admin-articles"] });
      qc.invalidateQueries({ queryKey: ["articles"] });
    }
  }

  if (!open)
    return (
      <Button className="h-12 w-full rounded-full text-base" onClick={() => setOpen(true)}>
        ✍️ Verhaal insturen en inplannen
      </Button>
    );

  const working = items?.some(
    (s) => s.status === "wacht" || s.status === "tekst" || s.status === "foto",
  );

  return (
    <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <h2 className="text-lg">✍️ Verhaal inplannen</h2>
        <button onClick={() => setOpen(false)} className="text-sm underline">
          Sluiten
        </button>
      </div>

      {!items ? (
        <>
          <p className="text-sm text-muted-foreground">
            Plak hier het verhaal uit je notities, met de titel op de eerste regel. De app kijkt de
            spelling na, maakt er goed leesbare alinea's van en zoekt er een foto bij. Daarna kies
            jij alleen nog de datum.
          </p>
          <Textarea
            id="story-import"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={10}
            placeholder={"Mijn eerste schooldag\nik was zo zenuwachtig iedereen kende elkaar al…"}
            className="rounded-2xl"
          />
          <p className="text-[11px] text-muted-foreground">
            Meerdere verhalen tegelijk? Zet tussen twee verhalen een regel met alleen{" "}
            <strong>---</strong>. Alleen voor 16+? Zet er een regel <strong>Leeftijd: 16+</strong>{" "}
            in.
          </p>
          <Button
            disabled={raw.trim().length < 20}
            onClick={prepare}
            className="h-12 w-full rounded-full"
          >
            ✨ Maak klaar
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold">
            {working
              ? `Bezig… ${items.filter((s) => s.status === "klaar" || s.status === "fout").length} van ${items.length} klaar`
              : "Klaar! Kijk het even na en kies de datum."}
          </p>
          <div className="space-y-3">
            {items.map((s, i) => (
              <article key={i} className="space-y-2 rounded-2xl bg-muted p-3 text-sm">
                <p className="text-[11px] font-semibold text-muted-foreground">
                  {STATUS_TEXT[s.status]}
                </p>
                {s.preview ? (
                  <img
                    src={s.preview}
                    alt=""
                    className="aspect-[3/2] w-full rounded-xl object-cover"
                  />
                ) : (
                  s.status !== "wacht" &&
                  s.status !== "tekst" && (
                    <div className="grid aspect-[3/2] w-full place-items-center rounded-xl bg-background text-xs text-muted-foreground">
                      {s.status === "foto" ? "Foto wordt gemaakt… (±30 sec)" : "Nog geen foto"}
                    </div>
                  )
                )}
                <p className="font-display text-lg leading-snug">{s.title}</p>
                <div className={`whitespace-pre-wrap text-sm ${s.open ? "" : "line-clamp-4"}`}>
                  {s.body}
                </div>
                <button
                  onClick={() => patch(i, { open: !s.open })}
                  className="text-xs font-semibold underline"
                >
                  {s.open ? "Minder tonen" : "Hele verhaal lezen"}
                </button>
                {s.error && <p className="text-xs text-destructive">{s.error}</p>}

                {(s.status === "klaar" || s.status === "fout") && (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="date"
                        aria-label="Datum"
                        value={s.day}
                        min={dayKey(new Date())}
                        onChange={(e) => patch(i, { day: e.target.value })}
                        className="h-9 rounded-full border border-input bg-background px-3 text-xs"
                      />
                      <input
                        type="time"
                        aria-label="Tijd"
                        value={s.time}
                        onChange={(e) => patch(i, { time: e.target.value })}
                        className="h-9 rounded-full border border-input bg-background px-3 text-xs"
                      />
                      <select
                        value={s.category}
                        aria-label="Categorie"
                        onChange={(e) => patch(i, { category: e.target.value as ArticleCategory })}
                        className="h-9 rounded-full border border-input bg-background px-2 text-xs"
                      >
                        {ARTICLE_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {categoryLabel(c)}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => patch(i, { minAge: s.minAge === 16 ? 12 : 16 })}
                        className={`h-9 rounded-full px-3 text-xs font-semibold ${s.minAge === 16 ? "bg-primary text-primary-foreground" : "bg-background"}`}
                      >
                        {s.minAge === 16 ? "16+" : "13+"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                      <button onClick={() => newPicture(i)} className="underline">
                        ✨ Andere foto
                      </button>
                      <label className="cursor-pointer underline">
                        🖼️ Eigen foto
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) patch(i, { photo: f, preview: URL.createObjectURL(f) });
                          }}
                        />
                      </label>
                      {s.status === "fout" ? (
                        <button onClick={() => prepareOne(i, s.original)} className="underline">
                          🔁 Opnieuw proberen
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            patch(i, { title: s.original.title, body: s.original.body })
                          }
                          className="underline"
                        >
                          ↩️ Originele tekst terug
                        </button>
                      )}
                      <button
                        onClick={() => setItems(items.filter((_, j) => j !== i))}
                        className="text-destructive underline"
                      >
                        Weglaten
                      </button>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-full"
              disabled={busy}
              onClick={() => setItems(null)}
            >
              Opnieuw
            </Button>
            <Button
              disabled={busy || !!working || !items.length}
              className="flex-1 rounded-full"
              onClick={plan}
            >
              {busy
                ? "Inplannen…"
                : items.length === 1
                  ? "📅 Inplannen"
                  : `📅 ${items.length} inplannen`}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
