import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const story = z.object({
  title: z.string().trim().min(1).max(150),
  body: z.string().trim().min(1).max(20000),
});

async function mustBeAdmin(context: {
  supabase: { rpc: (...a: never[]) => unknown };
  userId: string;
}) {
  const { data } = await (
    context.supabase.rpc as unknown as (
      fn: "has_role",
      args: { _user_id: string; _role: "admin" },
    ) => Promise<{ data: boolean | null }>
  )("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Alleen beheerders.");
}

/** Admin: spelling and sentence check of a story, keeping the writer's voice. */
export const proofread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => story.parse(d))
  .handler(async ({ data, context }) => {
    await mustBeAdmin(context);
    const { proofreadStory } = await import("@/server/story-ai.server");
    return proofreadStory(data.title, data.body);
  });

/** Admin: a calm banner illustration for a story (JPEG as base64). */
export const illustrate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => story.parse(d))
  .handler(async ({ data, context }) => {
    await mustBeAdmin(context);
    const { illustrateStory } = await import("@/server/story-ai.server");
    return illustrateStory(data.title, data.body);
  });
