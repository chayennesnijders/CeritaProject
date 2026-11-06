import { useState } from "react";
import { shrinkImage } from "@/lib/shrink-image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ARTICLE_CATEGORIES, categoryLabel, useArticleImage } from "@/lib/articles";
import { dayKey, dutchMoment, planDays, storyPhotoBank } from "@/lib/story-import";
import { celebrate } from "@/lib/celebrate";
import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  title: string;
  body: string;
  category: string;
  min_age: number;
  image_url: string | null;
};

/** All photos the stories already have, with viewable links, to reuse as a banner. */
function usePhotoBank(enabled: boolean) {
  return useQuery({
    queryKey: ["story-photo-bank"],
    enabled,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("articles")
        .select("image_url, body, is_published")
        .eq("kind", "verhaal");
      const bank = storyPhotoBank(data ?? []);
      const stored = bank.map((b) => b.path).filter((p) => !/^https?:\/\//.test(p));
      const signed = stored.length
        ? ((await supabase.storage.from("article-images").createSignedUrls(stored, 3600)).data ??
          [])
        : [];
      const url = new Map(signed.map((x) => [x.path, x.signedUrl]));
      return bank
        .map((b) => ({ ...b, src: /^https?:\/\//.test(b.path) ? b.path : url.get(b.path) }))
        .filter((b): b is typeof b & { src: string } => !!b.src);
    },
  });
}

/**
 * Beheer → Verhalen: stories that are ready but still hidden (e.g. corrected by Claude and added
 * with an update file). Add your own banner photo, pick a day and time, and plan them.
 */
export function PlanStories() {
  const { data: rows = [], error } = useQuery({
    queryKey: ["stories-to-plan"],
    queryFn: async () => {
      const [hidden, planned] = await Promise.all([
        supabase
          .from("articles")
          .select("id, title, body, category, min_age, image_url")
          .eq("is_published", false)
          .eq("kind", "verhaal")
          .order("created_at"),
        supabase
          .from("articles")
          .select("publish_at")
          .eq("is_published", true)
          .gte("publish_at", new Date().toISOString()),
      ]);
      if (hidden.error) throw hidden.error;
      return {
        list: (hidden.data ?? []) as Row[],
        taken: (planned.data ?? []).map((p) => dayKey(new Date(p.publish_at))),
      };
    },
    select: (d) => d,
  });
  if (error || !rows || !("list" in rows) || rows.list.length === 0) return null;
  const days = planDays(rows.list.length, rows.taken);
  return (
    <section className="space-y-3 rounded-3xl bg-secondary/40 p-4 shadow-soft">
      <h2 className="text-lg">📅 Klaar om in te plannen ({rows.list.length})</h2>
      <p className="text-xs text-muted-foreground">
        Nagekeken verhalen die nog verborgen zijn. Kies een foto en een datum, en tik op Inplannen.
      </p>
      {rows.list.map((r, i) => (
        <PlanCard key={r.id} row={r} suggestedDay={days[i]!} />
      ))}
    </section>
  );
}

function PlanCard({ row, suggestedDay }: { row: Row; suggestedDay: string }) {
  const qc = useQueryClient();
  const [day, setDay] = useState(suggestedDay);
  const [time, setTime] = useState("08:00");
  const [category, setCategory] = useState(row.category);
  const [sixteen, setSixteen] = useState(row.min_age >= 16);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const { data: bank } = usePhotoBank(picking);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data: existing } = useArticleImage(row.image_url);
  const shown = preview ?? existing ?? null;

  async function plan() {
    setBusy(true);
    let image_url = chosen ?? row.image_url;
    if (photo) {
      const small = await shrinkImage(photo, 1920);
      const path = `verhalen/${crypto.randomUUID()}.${small.type === "image/png" ? "png" : "jpg"}`;
      const up = await supabase.storage
        .from("article-images")
        .upload(path, small, { contentType: small.type });
      if (up.error) {
        setBusy(false);
        toast.error(`Foto uploaden lukte niet: ${up.error.message}`);
        return;
      }
      image_url = path;
    }
    const at = dutchMoment(day, time);
    const { data, error } = await supabase
      .from("articles")
      .update({
        is_published: true,
        publish_at: at,
        created_at: at,
        image_url,
        category,
        min_age: sixteen ? 16 : 12,
      })
      .eq("id", row.id)
      .select("id");
    setBusy(false);
    if (error || !data?.length) {
      toast.error(error?.message ?? "Inplannen lukte niet");
      return;
    }
    toast.success(`"${row.title}" staat ingepland 🎉`);
    celebrate("klein", { set: "hartjes" });
    qc.invalidateQueries({ queryKey: ["stories-to-plan"] });
    qc.invalidateQueries({ queryKey: ["admin-articles"] });
    qc.invalidateQueries({ queryKey: ["articles"] });
    qc.invalidateQueries({ queryKey: ["story-photo-bank"] });
  }

  return (
    <article className="space-y-2 rounded-2xl bg-card p-3 text-sm">
      {shown ? (
        <img src={shown} alt="" className="aspect-[3/2] w-full rounded-xl object-cover" />
      ) : (
        <div className="grid aspect-[3/2] w-full place-items-center rounded-xl bg-muted text-xs text-muted-foreground">
          Nog geen foto
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <label className="inline-block cursor-pointer rounded-full bg-muted px-3 py-1.5 text-xs font-semibold">
          🖼️ {shown ? "Andere foto" : "Kies een foto"}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setPhoto(f);
                setChosen(null);
                setPreview(URL.createObjectURL(f));
              }
            }}
          />
        </label>
        <button
          onClick={() => setPicking(!picking)}
          className="inline-block rounded-full bg-muted px-3 py-1.5 text-xs font-semibold"
        >
          📚 {picking ? "Sluiten" : "Uit eerdere verhalen"}
        </button>
      </div>
      {picking && (
        <div className="space-y-1">
          {!bank ? (
            <p className="text-xs text-muted-foreground">Foto's laden…</p>
          ) : bank.length === 0 ? (
            <p className="text-xs text-muted-foreground">Er zijn nog geen foto's.</p>
          ) : (
            <>
              <p className="text-[11px] text-muted-foreground">
                Tik op een foto. Foto's met 👁️ staan al bij een verhaal dat live of ingepland is.
              </p>
              <div className="grid max-h-72 grid-cols-3 gap-1.5 overflow-y-auto">
                {bank.map((b) => (
                  <button
                    key={b.path}
                    onClick={() => {
                      setChosen(b.path);
                      setPhoto(null);
                      setPreview(b.src);
                      setPicking(false);
                    }}
                    className={`relative overflow-hidden rounded-lg ${chosen === b.path ? "ring-2 ring-primary" : ""}`}
                  >
                    <img
                      src={b.src}
                      alt=""
                      loading="lazy"
                      className="aspect-[3/2] w-full object-cover"
                    />
                    {b.inUse && (
                      <span className="absolute right-1 top-1 rounded-full bg-black/60 px-1 text-[10px]">
                        👁️
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      <p className="font-display text-lg leading-snug">{row.title}</p>
      <div className={`whitespace-pre-wrap ${open ? "" : "line-clamp-4"}`}>{row.body}</div>
      <button onClick={() => setOpen(!open)} className="text-xs font-semibold underline">
        {open ? "Minder tonen" : "Hele verhaal lezen"}
      </button>
      <div className="flex flex-wrap gap-2">
        <input
          type="date"
          aria-label="Datum"
          value={day}
          min={dayKey(new Date())}
          onChange={(e) => setDay(e.target.value)}
          className="h-9 rounded-full border border-input bg-background px-3 text-xs"
        />
        <input
          type="time"
          aria-label="Tijd"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="h-9 rounded-full border border-input bg-background px-3 text-xs"
        />
        <select
          aria-label="Categorie"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-9 rounded-full border border-input bg-background px-2 text-xs"
        >
          {ARTICLE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {categoryLabel(c)}
            </option>
          ))}
        </select>
        <button
          onClick={() => setSixteen(!sixteen)}
          className={`h-9 rounded-full px-3 text-xs font-semibold ${sixteen ? "bg-primary text-primary-foreground" : "bg-muted"}`}
        >
          {sixteen ? "16+" : "13+"}
        </button>
      </div>
      <Button disabled={busy || !day} onClick={plan} className="w-full rounded-full">
        {busy
          ? "Inplannen…"
          : `📅 Inplannen op ${new Date(`${day}T12:00:00Z`).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" })}`}
      </Button>
    </article>
  );
}
