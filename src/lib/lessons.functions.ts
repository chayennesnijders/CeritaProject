import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
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

/** The licence of a logged-in teacher (profiles.is_teacher, linked through become_teacher). */
async function licenseForTeacher(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: profile }, { data: link }] = await Promise.all([
    supabaseAdmin.from("profiles").select("is_teacher").eq("id", userId).maybeSingle(),
    supabaseAdmin.from("teachers").select("license_id").eq("user_id", userId).maybeSingle(),
  ]);
  if (!profile?.is_teacher) throw new Error("Dit is geen leraar-account.");
  const { data: license } = link?.license_id
    ? await supabaseAdmin
        .from("school_licenses")
        .select("id, school, active, valid_until")
        .eq("id", link.license_id)
        .maybeSingle()
    : { data: null };
  return { db: supabaseAdmin, license, works: licenseWorks(license, dutchToday()) };
}

type Licensed = Awaited<ReturnType<typeof licenseFor>>;

/** Every published lesson, which ones this licence unlocks, and their files (names only). */
async function catalog({ db, license, works }: Licensed) {
  const [{ data: lessons }, { data: files }] = await Promise.all([
    db.from("lessons").select("id, title, summary, audience, minutes, theme, emoji, is_free, published, sort").eq("published", true).order("sort").order("created_at"),
    db.from("lesson_files").select("id, lesson_id, label, sort").order("sort"),
  ]);
  return {
    school: works ? (license?.school ?? null) : null,
    validUntil: works ? (license?.valid_until ?? null) : null,
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
}

/** A short-lived download link for one file, if the lesson is free or the licence works. */
async function download({ db, license, works }: Licensed, fileId: string, inline = false) {
  const { data: file } = await db
    .from("lesson_files")
    .select("id, path, label, lesson:lessons(id, is_free, published)")
    .eq("id", fileId)
    .maybeSingle();
  const lesson = file?.lesson as { id: string; is_free: boolean; published: boolean } | null | undefined;
  if (!file || !lesson || !mayDownload(lesson, works))
    throw new Error("Voor deze les heb je een schoolcode nodig.");
  const name = `${file.label.replace(/[^\p{L}\p{N} ._-]/gu, "").trim() || "les"}${/\.[a-z0-9]+$/i.exec(file.path)?.[0] ?? ""}`;
  const { data: signed, error } = await db.storage
    .from("lessons")
    .createSignedUrl(file.path, 300, inline ? undefined : { download: name });
  if (error || !signed) throw new Error("Openen lukte niet. Probeer het zo nog eens.");
  await db.from("lesson_downloads").insert({ lesson_id: lesson.id, file_id: file.id, license_id: works ? (license?.id ?? null) : null });
  return { url: signed.signedUrl };
}

const codeInput = z.object({ code: z.string().trim().max(20).optional() });

/** The lesson library for a school code (public page /lessen). */
export const lessonCatalog = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => codeInput.parse(d))
  .handler(async ({ data }) => {
    const l = await licenseFor(data.code);
    return {
      ...(await catalog(l)),
      codeProblem: data.code && !l.works ? (l.license ? "Deze code is verlopen of uitgezet." : "Deze code kennen we niet. Controleer hem nog eens.") : null,
    };
  });

/** A download link for one lesson file, with a school code. */
export const lessonDownload = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => codeInput.extend({ fileId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => download(await licenseFor(data.code), data.fileId));

/** The lessons for a logged-in teacher, through the school their account is linked to. */
export const teacherCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const l = await licenseForTeacher(context.userId);
    return { ...(await catalog(l)), expiredSchool: !l.works ? (l.license?.school ?? null) : null };
  });

/** Open (inline) or download one lesson file as a logged-in teacher. */
export const teacherFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ fileId: z.string().uuid(), open: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => download(await licenseForTeacher(context.userId), data.fileId, !!data.open));
