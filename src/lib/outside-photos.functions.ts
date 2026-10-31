import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Stories whose cover or photos still point at another website (WordPress). Server only. */
async function storiesWithOutsidePhotos() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { outsidePhotos } = await import("@/lib/outside-photos");
  const { data, error } = await supabaseAdmin.from("articles").select("id, title, image_url, body");
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((a) => {
      const story = { ...a, body: a.body ?? "" };
      return { ...story, photos: outsidePhotos(story) };
    })
    .filter((a) => a.photos.length > 0);
}

/** Admin: how many story photos still live on WordPress (or another website). */
export const countOutsidePhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Alleen beheerders.");
    const list = await storiesWithOutsidePhotos();
    return { stories: list.length, photos: list.reduce((n, a) => n + a.photos.length, 0) };
  });

/**
 * Admin: copy the outside photos of a few stories into article-images (wordpress/<story>/…) and point
 * the story at the copies. The app calls this again, passing the stories already tried in `skip`,
 * until `left` is 0. A photo that cannot be downloaded keeps its address; its story is in `failed`.
 */
export const copyOutsidePhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ skip: z.array(z.string().uuid()).max(5000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Alleen beheerders.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { photoExtension, photoSources, swapPhotos } = await import("@/lib/outside-photos");
    const skip = new Set(data.skip);
    const todo = (await storiesWithOutsidePhotos()).filter((a) => !skip.has(a.id));
    const batch = todo.slice(0, 3);
    const failed: string[] = [];
    let copied = 0;
    for (const a of batch) {
      const stored: Record<string, string> = {};
      for (const [i, url] of a.photos.entries()) {
        for (const src of photoSources(url)) {
          try {
            const res = await fetch(src, { signal: AbortSignal.timeout(15_000) });
            const type = res.headers.get("Content-Type") ?? "";
            if (!res.ok || !type.startsWith("image/")) continue;
            const path = `wordpress/${a.id}/${Date.now()}-${i}.${photoExtension(src, type)}`;
            const { error } = await supabaseAdmin.storage
              .from("article-images")
              .upload(path, await res.arrayBuffer(), { contentType: type, upsert: true });
            if (error) continue;
            stored[url] = path;
            copied++;
            break;
          } catch {
            /* try the next address */
          }
        }
      }
      if (Object.keys(stored).length < a.photos.length) failed.push(a.title);
      if (Object.keys(stored).length) {
        const { error } = await supabaseAdmin
          .from("articles")
          .update(swapPhotos(a, stored))
          .eq("id", a.id);
        if (error) throw new Error(error.message);
      }
    }
    return {
      copied,
      failed,
      tried: batch.map((a) => a.id),
      left: todo.length - batch.length,
    };
  });
