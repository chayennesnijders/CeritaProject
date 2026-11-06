import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { dutchToday, makeCode, schoolYearEnd } from "@/lib/lessons";

type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
type LessonFile = Database["public"]["Tables"]["lesson_files"]["Row"];
type License = Database["public"]["Tables"]["school_licenses"]["Row"];

const input = "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm";

/** Beheer → Lessen & scholen: the lesson library for teachers (/lessen) and the schools' codes. */
export function LessonsAdmin() {
  const { data, isLoading } = useQuery({
    queryKey: ["lessons-admin"],
    queryFn: async () => {
      const [l, f, s, d] = await Promise.all([
        supabase.from("lessons").select("*").order("sort").order("created_at"),
        supabase.from("lesson_files").select("*").order("sort"),
        supabase.from("school_licenses").select("*").order("created_at", { ascending: false }),
        supabase.from("lesson_downloads").select("lesson_id, license_id"),
      ]);
      if (l.error) throw l.error;
      return { lessons: l.data ?? [], files: f.data ?? [], licenses: s.data ?? [], downloads: d.data ?? [] };
    },
  });
  if (isLoading) return <p className="text-sm text-muted-foreground">Laden…</p>;
  if (!data)
    return (
      <p className="rounded-3xl bg-card p-4 text-sm shadow-soft">
        De lessen zijn nog niet geïnstalleerd. Plak <b>supabase/update-48-lessen.sql</b> in Supabase → SQL Editor en klik Run.
      </p>
    );
  return (
    <div className="space-y-6">
      <p className="rounded-2xl bg-secondary p-3 text-sm text-secondary-foreground">
        Leraren vinden de lessen op <b>app.ceritaproject.nl/lessen</b>. Gratis lessen kan iedereen downloaden; de rest
        alleen met een schoolcode. Leraren hebben geen account nodig.
      </p>
      <Lessons lessons={data.lessons} files={data.files} downloads={data.downloads} />
      <Licenses licenses={data.licenses} downloads={data.downloads} />
    </div>
  );
}

function Lessons({ lessons, files, downloads }: { lessons: Lesson[]; files: LessonFile[]; downloads: { lesson_id: string | null }[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);
  async function add() {
    const { data, error } = await supabase
      .from("lessons")
      .insert({ title: "Nieuwe les", sort: lessons.length })
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setOpen(data.id);
    qc.invalidateQueries({ queryKey: ["lessons-admin"] });
  }
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg">📚 Lessen</h2>
        <Button size="sm" className="rounded-full" onClick={add}>+ Les</Button>
      </div>
      {lessons.length === 0 && <p className="text-sm text-muted-foreground">Nog geen lessen. Voeg de eerste toe.</p>}
      {lessons.map((l) => (
        <div key={l.id} className="rounded-3xl bg-card shadow-soft">
          <button onClick={() => setOpen(open === l.id ? null : l.id)} className="flex w-full items-center gap-3 p-4 text-left">
            <span className="text-2xl">{l.emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{l.title}</span>
              <span className="block text-xs text-muted-foreground">
                {l.published ? "Online" : "Concept"}
                {l.is_free ? " · gratis" : ""} · {files.filter((f) => f.lesson_id === l.id).length} bestanden ·{" "}
                {downloads.filter((d) => d.lesson_id === l.id).length} downloads
              </span>
            </span>
            <span className="text-muted-foreground">{open === l.id ? "▴" : "▾"}</span>
          </button>
          {open === l.id && <LessonEditor lesson={l} files={files.filter((f) => f.lesson_id === l.id)} />}
        </div>
      ))}
    </section>
  );
}

function LessonEditor({ lesson, files }: { lesson: Lesson; files: LessonFile[] }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: lesson.title,
    summary: lesson.summary,
    audience: lesson.audience,
    minutes: lesson.minutes,
    theme: lesson.theme,
    emoji: lesson.emoji,
    is_free: lesson.is_free,
    published: lesson.published,
    sort: lesson.sort,
  });
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["lessons-admin"] });

  async function save() {
    const { error } = await supabase.from("lessons").update(form).eq("id", lesson.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Opgeslagen");
    refresh();
  }
  async function upload(file: File) {
    const name = label.trim() || file.name.replace(/\.[^.]+$/, "");
    const ext = (/\.([a-z0-9]{1,6})$/i.exec(file.name)?.[1] ?? "pdf").toLowerCase();
    const path = `${lesson.id}/${crypto.randomUUID()}.${ext}`;
    setBusy(true);
    const { error } = await supabase.storage.from("lessons").upload(path, file, file.type ? { contentType: file.type } : {});
    if (error) {
      setBusy(false);
      {
      toast.error(error.message.includes("mime") ? "Dit soort bestand kan niet (wel: PDF, PowerPoint, Word, mp4, png, jpg)." : error.message);
      return;
    }
    }
    const { error: e2 } = await supabase.from("lesson_files").insert({ lesson_id: lesson.id, label: name.slice(0, 80), path, sort: files.length });
    setBusy(false);
    if (e2) {
      toast.error(e2.message);
      return;
    }
    setLabel("");
    toast.success("Bestand toegevoegd");
    refresh();
  }
  async function removeFile(f: LessonFile) {
    const { data, error } = await supabase.from("lesson_files").delete().eq("id", f.id).select("id");
    if (error || !data?.length) {
      toast.error("Verwijderen lukte niet.");
      return;
    }
    await supabase.storage.from("lessons").remove([f.path]);
    refresh();
  }
  async function removeLesson() {
    const { data, error } = await supabase.from("lessons").delete().eq("id", lesson.id).select("id");
    if (error || !data?.length) {
      toast.error("Verwijderen lukte niet.");
      return;
    }
    if (files.length) await supabase.storage.from("lessons").remove(files.map((f) => f.path));
    toast.success("Les verwijderd");
    refresh();
  }

  return (
    <div className="space-y-3 border-t border-border/50 p-4 text-sm">
      <div className="grid grid-cols-[4rem_1fr] gap-2">
        <input aria-label="Emoji" className={input} value={form.emoji} maxLength={4} onChange={(e) => setForm({ ...form, emoji: e.target.value })} />
        <input aria-label="Titel" className={input} value={form.title} maxLength={120} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </div>
      <textarea
        aria-label="Korte beschrijving"
        placeholder="Korte beschrijving voor leraren"
        className="w-full rounded-xl border border-input bg-background p-3"
        rows={3}
        maxLength={1000}
        value={form.summary}
        onChange={(e) => setForm({ ...form, summary: e.target.value })}
      />
      <div className="grid grid-cols-3 gap-2">
        <label className="space-y-1"><span className="text-xs text-muted-foreground">Voor wie</span>
          <input className={input} value={form.audience} maxLength={60} onChange={(e) => setForm({ ...form, audience: e.target.value })} /></label>
        <label className="space-y-1"><span className="text-xs text-muted-foreground">Minuten</span>
          <input type="number" className={input} value={form.minutes} min={5} max={300} onChange={(e) => setForm({ ...form, minutes: Number(e.target.value) || 50 })} /></label>
        <label className="space-y-1"><span className="text-xs text-muted-foreground">Thema</span>
          <input className={input} value={form.theme} maxLength={60} placeholder="bijv. Eenzaamheid" onChange={(e) => setForm({ ...form, theme: e.target.value })} /></label>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2"><Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} /> Online</label>
        <label className="flex items-center gap-2"><Switch checked={form.is_free} onCheckedChange={(v) => setForm({ ...form, is_free: v })} /> Gratis (proefles)</label>
        <label className="flex items-center gap-2">Volgorde
          <input type="number" className="h-9 w-16 rounded-xl border border-input bg-background px-2" value={form.sort} onChange={(e) => setForm({ ...form, sort: Number(e.target.value) || 0 })} /></label>
      </div>
      <Button className="rounded-full" onClick={save}>Les opslaan</Button>

      <div className="space-y-2 rounded-2xl bg-muted p-3">
        <p className="font-semibold">Bestanden</p>
        {files.length === 0 && <p className="text-xs text-muted-foreground">Nog geen bestanden. Download de dia's als PowerPoint of PDF en de handleiding als PDF, en voeg ze hier toe.</p>}
        {files.map((f) => (
          <div key={f.id} className="flex items-center gap-2 rounded-xl bg-card px-3 py-2">
            <span className="min-w-0 flex-1 truncate">{f.label}</span>
            <button aria-label={`${f.label} verwijderen`} onClick={() => void removeFile(f)} className="p-1 text-muted-foreground"><Trash2 className="size-4" /></button>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <input className={`${input} flex-1`} placeholder="Naam, bijv. Dia's (PowerPoint)" value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} />
          <label className={`inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground ${busy ? "opacity-60" : ""}`}>
            <Upload className="size-4" /> {busy ? "Uploaden…" : "Bestand kiezen"}
            <input
              type="file"
              hidden
              disabled={busy}
              accept=".pdf,.pptx,.docx,.mp4,.png,.jpg,.jpeg"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void upload(f);
              }}
            />
          </label>
        </div>
      </div>

      {confirmDelete ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex-1">Deze les en de bestanden verwijderen?</span>
          <Button size="sm" variant="destructive" className="rounded-full" onClick={() => void removeLesson()}>Verwijderen</Button>
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => setConfirmDelete(false)}>Nee</Button>
        </div>
      ) : (
        <button onClick={() => setConfirmDelete(true)} className="text-xs text-muted-foreground underline">Les verwijderen</button>
      )}
    </div>
  );
}

function Licenses({ licenses, downloads }: { licenses: License[]; downloads: { license_id: string | null }[] }) {
  const qc = useQueryClient();
  const today = dutchToday();
  const [school, setSchool] = useState("");
  const [contact, setContact] = useState("");
  const [until, setUntil] = useState(schoolYearEnd(today));
  const [confirm, setConfirm] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["lessons-admin"] });

  async function add() {
    if (!school.trim()) {
      toast.error("Vul de naam van de school in.");
      return;
    }
    for (let tries = 0; tries < 3; tries++) {
      const code = makeCode(crypto.getRandomValues(new Uint8Array(8)));
      const { error } = await supabase.from("school_licenses").insert({ school: school.trim(), contact: contact.trim(), valid_until: until, code });
      if (!error) {
        toast.success(`Code gemaakt: ${code}`);
        setSchool("");
        setContact("");
        refresh();
        return;
      }
      if (error.code !== "23505") {
      toast.error(error.message);
      return;
    }
    }
    toast.error("Een code maken lukte niet. Probeer het nog eens.");
  }
  async function setActive(l: License, active: boolean) {
    const { error } = await supabase.from("school_licenses").update({ active }).eq("id", l.id);
    if (error) toast.error(error.message);
    refresh();
  }
  async function remove(l: License) {
    const { data, error } = await supabase.from("school_licenses").delete().eq("id", l.id).select("id");
    setConfirm(null);
    if (error || !data?.length) {
      toast.error("Verwijderen lukte niet.");
      return;
    }
    refresh();
  }

  return (
    <section className="space-y-2">
      <h2 className="text-lg">🏫 Scholen en codes</h2>
      <div className="space-y-2 rounded-3xl bg-card p-4 text-sm shadow-soft">
        <p className="font-semibold">Nieuwe school</p>
        <input className={input} placeholder="Naam van de school" value={school} maxLength={120} onChange={(e) => setSchool(e.target.value)} />
        <input className={input} placeholder="Contactpersoon of e-mail (alleen voor jou)" value={contact} maxLength={200} onChange={(e) => setContact(e.target.value)} />
        <label className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Geldig tot en met</span>
          <input type="date" className="h-10 rounded-xl border border-input bg-background px-2" value={until} onChange={(e) => setUntil(e.target.value)} /></label>
        <Button className="rounded-full" onClick={() => void add()}>Code maken</Button>
      </div>
      {licenses.map((l) => {
        const works = l.active && l.valid_until >= today;
        return (
          <div key={l.id} className="space-y-2 rounded-3xl bg-card p-4 text-sm shadow-soft">
            <div className="flex flex-wrap items-center gap-2">
              <p className="min-w-0 flex-1 font-semibold">{l.school}</p>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${works ? "bg-[#e5f4e4] text-[#1b4332]" : "bg-muted text-muted-foreground"}`}>
                {works ? "Werkt" : l.active ? "Verlopen" : "Uit"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <code className="rounded-lg bg-muted px-2 py-1 font-mono text-base tracking-wider">{l.code}</code>
              <button
                onClick={() => void navigator.clipboard?.writeText(l.code).then(() => toast.success("Code gekopieerd"), () => {})}
                className="flex items-center gap-1 text-xs text-primary"
              >
                <Copy className="size-3.5" /> Kopiëren
              </button>
              <span className="text-xs text-muted-foreground">
                t/m {new Date(l.valid_until).toLocaleDateString("nl-NL")} · {downloads.filter((d) => d.license_id === l.id).length} downloads
              </span>
            </div>
            {l.contact && <p className="text-xs text-muted-foreground">{l.contact}</p>}
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2"><Switch checked={l.active} onCheckedChange={(v) => void setActive(l, v)} /> Aan</label>
              {confirm === l.id ? (
                <span className="flex items-center gap-2">
                  Verwijderen?
                  <Button size="sm" variant="destructive" className="rounded-full" onClick={() => void remove(l)}>Ja</Button>
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => setConfirm(null)}>Nee</Button>
                </span>
              ) : (
                <button onClick={() => setConfirm(l.id)} className="text-xs text-muted-foreground underline">Verwijderen</button>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
