import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { dutchToday, licenseWorks, mayDownload, normalizeCode } from "@/lib/lessons";

// Public (no account): teachers use a school code. Everything is checked here with the service
// role; the tables themselves stay closed to the outside world.

async function licenseFor(code: string | undefined) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const norm = code ? normalizeCode(code) : null;
  if (!norm) return { db: supabaseAdmin, license: null, works: false };
  const { data } = await supabaseAdmin
    .from("school_licenses")
    .select("id, school, active, valid_until")
    .eq("code", norm)
    .maybeSingle();
  return { db: supabaseAdmin, license: data, works: licenseWorks(data, dutchToday()) };
}

const codeInput = z.object({ code: z.string().trim().max(20).optional() });

/** The lesson library: every published lesson, which ones this code unlocks, and their files (names only). */
export const lessonCatalog = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => codeInput.parse(d))
  .handler(async ({ data }) => {
    const { db, license, works } = await licenseFor(data.code);
    const [{ data: lessons }, { data: files }] = await Promise.all([
      db.from("lessons").select("id, title, summary, audience, minutes, theme, emoji, is_free, published, sort").eq("published", true).order("sort").order("created_at"),
      db.from("lesson_files").select("id, lesson_id, label, sort").order("sort"),
    ]);
    return {
      school: works ? (license?.school ?? null) : null,
      validUntil: works ? (license?.valid_until ?? null) : null,
      codeProblem: data.code && !works ? (license ? "Deze code is verlopen of uitgezet." : "Deze code kennen we niet. Controleer hem nog eens.") : null,
      lessons: (lessons ?? []).map((l) => ({
        id: l.id,
        title: l.title,
        summary: l.summary,
        audience: l.audience,
        minutes: l.minutes,
        theme: l.theme,
        emoji: l.emoji,
        isFree: l.is_free,
        unlocked: mayDownload(l, works),
        files: (files ?? []).filter((f) => f.lesson_id === l.id).map((f) => ({ id: f.id, label: f.label })),
      })),
    };
  });

/** A short-lived download link for one lesson file, if the lesson is free or the code works. */
export const lessonDownload = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => codeInput.extend({ fileId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { db, license, works } = await licenseFor(data.code);
    const { data: file } = await db
      .from("lesson_files")
      .select("id, path, label, lesson:lessons(id, is_free, published)")
      .eq("id", data.fileId)
      .maybeSingle();
    const lesson = file?.lesson as { id: string; is_free: boolean; published: boolean } | null | undefined;
    if (!file || !lesson || !mayDownload(lesson, works))
      throw new Error("Voor deze les heb je een schoolcode nodig.");
    const name = `${file.label.replace(/[^\p{L}\p{N} ._-]/gu, "").trim() || "les"}${/\.[a-z0-9]+$/i.exec(file.path)?.[0] ?? ""}`;
    const { data: signed, error } = await db.storage.from("lessons").createSignedUrl(file.path, 300, { download: name });
    if (error || !signed) throw new Error("Downloaden lukte niet. Probeer het zo nog eens.");
    await db.from("lesson_downloads").insert({ lesson_id: lesson.id, file_id: file.id, license_id: works ? (license?.id ?? null) : null });
    return { url: signed.signedUrl };
  });
