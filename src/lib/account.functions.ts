import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Buckets where a member's own files live under "<user id>/…".
const OWN_FILE_BUCKETS = ["avatars", "diary-photos", "diary-audio", "chat-audio", "chat-files"];

/** Deletes the signed-in member's account: their files, push tokens and the auth user (the rest cascades). */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isOwner } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "owner",
    });
    if (isOwner) throw new Error("De eigenaar kan het account niet zelf verwijderen.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Storage has no "delete folder", so walk the member's folder and remove every file.
    async function filesUnder(bucket: string, prefix: string): Promise<string[]> {
      const { data } = await supabaseAdmin.storage.from(bucket).list(prefix, { limit: 1000 });
      const out: string[] = [];
      for (const item of data ?? []) {
        const path = `${prefix}/${item.name}`;
        if (item.id) out.push(path);
        else out.push(...(await filesUnder(bucket, path)));
      }
      return out;
    }
    for (const bucket of OWN_FILE_BUCKETS) {
      const paths = await filesUnder(bucket, context.userId);
      if (paths.length) await supabaseAdmin.storage.from(bucket).remove(paths);
    }

    await supabaseAdmin.from("push_tokens").delete().eq("user_id", context.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw new Error("Account verwijderen lukte niet. Probeer het later opnieuw.");
    return { ok: true };
  });
