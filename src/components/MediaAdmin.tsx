import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import {
  formatDuration,
  isLive,
  MEDIA_KINDS,
  mediaKind,
  toLocalInput,
  type MediaKind,
} from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Reads the length of an audio or video file before uploading it. */
function fileDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const el = document.createElement(file.type.startsWith("video") ? "video" : "audio");
    const url = URL.createObjectURL(file);
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(el.duration) ? Math.round(el.duration) : null);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    el.src = url;
  });
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Beheer → Luisteren: add a podcast, interview or video, now or planned, and manage the list. */
export function MediaAdmin() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [kind, setKind] = useState<MediaKind>("podcast");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [sixteen, setSixteen] = useState(false);
  const [planned, setPlanned] = useState(false);
  const [publishAt, setPublishAt] = useState(() =>
    toLocalInput(new Date(Date.now() + 86_400_000).toISOString()),
  );
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<{ id: string; title: string; paths: string[] } | null>(
    null,
  );
  const [moving, setMoving] = useState<{ id: string; value: string } | null>(null);

  const { data: items = [] } = useQuery({
    queryKey: ["admin-media"],
    queryFn: async () =>
      (await supabase.from("media_items").select("*").order("publish_at", { ascending: false }))
        .data ?? [],
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-media"] });
    qc.invalidateQueries({ queryKey: ["media"] });
  };

  async function save() {
    if (!file || !me?.user || title.trim().length < 2) return;
    const moment = planned ? new Date(publishAt) : new Date();
    if (planned && (Number.isNaN(moment.getTime()) || moment.getTime() < Date.now() - 60_000)) {
      toast.error("Kies een moment in de toekomst.");
      return;
    }
    setBusy(true);
    try {
      const id = crypto.randomUUID();
      const ext = (f: File, fallback: string) => f.name.split(".").pop()?.toLowerCase() || fallback;
      const mediaPath = `${id}/opname.${ext(file, "mp3")}`;
      const up = await supabase.storage
        .from("media")
        .upload(mediaPath, file, file.type ? { contentType: file.type } : {});
      if (up.error) throw new Error(`Uploaden lukte niet: ${up.error.message}`);
      let coverPath: string | null = null;
      if (cover) {
        coverPath = `${id}/cover.${ext(cover, "jpg")}`;
        const c = await supabase.storage
          .from("media")
          .upload(coverPath, cover, cover.type ? { contentType: cover.type } : {});
        if (c.error) throw new Error(`Coverfoto uploaden lukte niet: ${c.error.message}`);
      }
      const { error } = await supabase.from("media_items").insert({
        id,
        kind,
        title: title.trim(),
        description: description.trim(),
        media_path: mediaPath,
        media_type: file.type.startsWith("video") ? "video" : "audio",
        cover_path: coverPath,
        duration_seconds: await fileDuration(file),
        min_age: sixteen ? 16 : 12,
        publish_at: moment.toISOString(),
        created_by: me.user.id,
      });
      if (error) throw new Error(error.message);
      toast.success(
        planned ? `Ingepland voor ${when(moment.toISOString())} 📅` : "Staat nu live! 🎧",
      );
      setTitle("");
      setDescription("");
      setFile(null);
      setCover(null);
      setSixteen(false);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Dat lukte niet.");
    } finally {
      setBusy(false);
    }
  }

  async function update(id: string, patch: { publish_at?: string; min_age?: number }) {
    const { error } = await supabase.from("media_items").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    refresh();
  }

  async function confirmDelete() {
    if (!deleting) return;
    const { data, error } = await supabase
      .from("media_items")
      .delete()
      .eq("id", deleting.id)
      .select("id");
    if (error || !data?.length) toast.error(error?.message ?? "Verwijderen lukte niet.");
    else {
      await supabase.storage.from("media").remove(deleting.paths);
      toast.success("Verwijderd.");
    }
    setDeleting(null);
    refresh();
  }

  return (
    <section className="space-y-4">
      <div className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
        <h2 className="text-lg">🎧 Nieuwe opname</h2>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(MEDIA_KINDS) as MediaKind[]).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`rounded-2xl p-3 text-center text-sm font-semibold transition active:scale-95 ${kind === k ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              <span className="block text-2xl">{MEDIA_KINDS[k].emoji}</span>
              {MEDIA_KINDS[k].label}
            </button>
          ))}
        </div>
        <Input
          placeholder="Titel"
          value={title}
          maxLength={140}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-2xl"
        />
        <Textarea
          placeholder="Waar gaat het over? Met wie praat je?"
          value={description}
          maxLength={4000}
          rows={3}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-2xl"
        />
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/50 px-4 py-4 text-sm font-semibold">
          <input
            type="file"
            accept="audio/*,video/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file
            ? `✅ ${file.name} (${Math.round(file.size / 1_000_000)} MB)`
            : "🎵 Kies je opname (geluid of video)"}
        </label>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-full border border-dashed border-muted-foreground/40 px-4 py-2.5 text-sm text-muted-foreground">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setCover(e.target.files?.[0] ?? null)}
          />
          {cover ? `🖼️ ${cover.name}` : "🖼️ Coverfoto (optioneel)"}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={sixteen}
            onChange={(e) => setSixteen(e.target.checked)}
            className="size-4 accent-primary"
          />
          Alleen voor 16+ (gaat over heel zware dingen)
        </label>
        <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
          {[
            [false, "🚀 Nu plaatsen"],
            [true, "📅 Inplannen"],
          ].map(([v, label]) => (
            <button
              key={String(v)}
              onClick={() => setPlanned(v as boolean)}
              className={`rounded-full py-1.5 text-sm font-semibold ${planned === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {label as string}
            </button>
          ))}
        </div>
        {planned && (
          <label className="block space-y-1 text-sm">
            <span className="font-semibold">Wanneer moet hij online komen?</span>
            <Input
              type="datetime-local"
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
              className="h-12 rounded-2xl"
            />
          </label>
        )}
        <Button
          disabled={busy || !file || title.trim().length < 2}
          onClick={save}
          className="h-12 w-full rounded-full"
        >
          {busy ? "Uploaden… even geduld" : planned ? "Inplannen" : "Plaatsen"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Tip: mp3 of m4a is het kleinst. Heel grote bestanden (meer dan 50 MB) passen misschien
          niet; maak de opname dan korter of kleiner.
        </p>
      </div>

      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground">Nog geen opnames.</p>}
        {items.map((m) => {
          const k = mediaKind(m.kind);
          const live = isLive(m);
          return (
            <div key={m.id} className="space-y-2 rounded-3xl bg-card p-4 shadow-soft">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{k.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{m.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {k.label}
                    {m.duration_seconds ? ` · ${formatDuration(m.duration_seconds)}` : ""} ·{" "}
                    {m.media_type === "video" ? "video" : "geluid"}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${live ? "bg-emerald-100 text-emerald-800" : "bg-secondary text-secondary-foreground"}`}
                >
                  {live ? "Live" : `📅 ${when(m.publish_at)}`}
                </span>
              </div>
              {moving?.id === m.id ? (
                <div className="flex gap-2">
                  <Input
                    type="datetime-local"
                    value={moving.value}
                    onChange={(e) => setMoving({ id: m.id, value: e.target.value })}
                    className="rounded-2xl"
                  />
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={() => {
                      update(m.id, { publish_at: new Date(moving.value).toISOString() });
                      setMoving(null);
                    }}
                  >
                    Opslaan
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  <button
                    className="font-semibold text-primary underline"
                    onClick={() => setMoving({ id: m.id, value: toLocalInput(m.publish_at) })}
                  >
                    Ander moment
                  </button>
                  {!live && (
                    <button
                      className="font-semibold text-primary underline"
                      onClick={() => update(m.id, { publish_at: new Date().toISOString() })}
                    >
                      Nu meteen live
                    </button>
                  )}
                  <button
                    className="font-semibold underline"
                    onClick={() => update(m.id, { min_age: m.min_age >= 16 ? 12 : 16 })}
                  >
                    {m.min_age >= 16 ? "16+" : "12+"} (wissel)
                  </button>
                  <button
                    className="font-semibold text-destructive underline"
                    onClick={() =>
                      setDeleting({
                        id: m.id,
                        title: m.title,
                        paths: [m.media_path, ...(m.cover_path ? [m.cover_path] : [])],
                      })
                    }
                  >
                    Verwijderen
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Opname verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleting?.title}" en het bestand verdwijnen voor altijd uit de app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Nee, laat staan</AlertDialogCancel>
            <Button
              className="rounded-full bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Ja, verwijder
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
