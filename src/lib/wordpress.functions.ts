import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  DEFAULT_WORDPRESS_SITE,
  fillPhotos,
  photoExt,
  suggestedMinAge,
  wpPostToArticle,
  type WpPost,
} from "@/lib/wordpress";

const PER_PAGE = 3;

/** One page of WordPress posts, from the site itself or (fallback) the WordPress.com API. */
async function fetchPosts(page: number) {
  const site = (process.env["WORDPRESS_SITE_URL"] ?? DEFAULT_WORDPRESS_SITE).replace(/\/+$/, "");
  const query = `per_page=${PER_PAGE}&page=${page}&orderby=date&order=asc&_embed=wp:featuredmedia,wp:term`;
  const urls = [
    `${site}/wp-json/wp/v2/posts?${query}`,
    `https://public-api.wordpress.com/wp/v2/sites/${new URL(site).host}/posts?${query}`,
  ];
  let last = "";
  for (const url of urls) {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.status === 400) return { posts: [] as WpPost[], totalPages: page - 1, total: 0 }; // past the last page
    if (res.ok) {
      return {
        posts: (await res.json()) as WpPost[],
        totalPages: Number(res.headers.get("X-WP-TotalPages") ?? 1),
        total: Number(res.headers.get("X-WP-Total") ?? 0),
      };
    }
    last = `${res.status} ${url}`;
  }
  throw new Error(`WordPress gaf geen verhalen terug (${last}).`);
}

/**
 * Admin-only: imports one page of WordPress stories into Ontdekken. Photos are copied into the
 * article-images bucket (wordpress/<post>/…); a story that was imported before is updated, and its
 * photos are not downloaded again. Call with page 1, 2, … until `done`.
 */
export const importWordPressPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ page: z.number().int().min(1).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Alleen beheerders.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { posts, totalPages, total } = await fetchPosts(data.page);

    // Copies one photo; falls back to the WordPress address if downloading or uploading fails.
    async function copyPhoto(url: string, path: string) {
      try {
        const res = await fetch(url);
        if (!res.ok) return url;
        const type = res.headers.get("Content-Type") ?? "image/jpeg";
        if (!type.startsWith("image/")) return url;
        const { error } = await supabaseAdmin.storage
          .from("article-images")
          .upload(path, await res.arrayBuffer(), { contentType: type, upsert: true });
        return error ? url : path;
      } catch {
        return url;
      }
    }

    const imported: { title: string; isNew: boolean; sixteen: boolean }[] = [];
    for (const post of posts) {
      const a = wpPostToArticle(post);
      const { data: existing } = await supabaseAdmin
        .from("articles")
        .select("id, image_url, body, min_age")
        .eq("wp_id", a.wp_id)
        .maybeSingle();
      const base = `wordpress/${a.wp_id}`;
      // New stories start at a suggested age; for stories imported before, the admin's choice stays.
      const minAge = existing ? existing.min_age : suggestedMinAge(a.title, a.body);
      let photos: string[];
      let cover: string | null;
      if (existing) {
        // Already imported: keep the photos it already has (same paths, or WordPress addresses).
        const kept = [...existing.body.matchAll(/\[\[foto:(.+?)\]\]/g)].map((m) => m[1]!);
        photos = a.images.map((url, i) => kept[i] ?? url);
        cover = existing.image_url;
      } else {
        photos = await Promise.all(
          a.images.map((url, i) => copyPhoto(url, `${base}/${i}.${photoExt(url)}`)),
        );
        cover = a.cover
          ? await copyPhoto(a.cover, `${base}/cover.${photoExt(a.cover)}`)
          : (photos[0] ?? null);
      }
      const row = {
        wp_id: a.wp_id,
        title: a.title.slice(0, 200),
        body: fillPhotos(a.body, photos),
        category: a.category,
        emoji: "📖",
        image_url: cover,
        is_published: true,
        created_at: a.created_at,
      };
      const { error } = existing
        ? await context.supabase.from("articles").update(row).eq("id", existing.id)
        : await context.supabase
            .from("articles")
            .insert({ ...row, author_id: context.userId, min_age: minAge });
      if (error) throw new Error(`"${a.title}": ${error.message}`);
      imported.push({ title: a.title, isNew: !existing, sixteen: minAge === 16 });
    }
    return {
      page: data.page,
      totalPages,
      total,
      imported,
      done: posts.length === 0 || data.page >= totalPages,
    };
  });
