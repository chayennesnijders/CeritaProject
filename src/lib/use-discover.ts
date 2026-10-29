import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NO_REACTIONS, type ReactionCounts, type ReactionKind } from "@/lib/discover";

/** Everything Ontdekken and a story page need: the stories, reaction counts and the member's own saves/reads/reactions. */
export function useDiscover(uid: string | undefined) {
  const stories = useQuery({
    queryKey: ["articles"],
    queryFn: async () =>
      (
        await supabase
          .from("articles")
          .select("id, title, body, emoji, category, created_at, image_url, min_age")
          .eq("is_published", true)
          .order("created_at", { ascending: false })
      ).data ?? [],
  });
  const counts = useQuery({
    queryKey: ["article-reactions"],
    queryFn: async () => {
      const rows = (await supabase.rpc("article_reaction_counts")).data ?? [];
      return new Map<string, ReactionCounts>(
        rows.map((r) => [
          r.article_id,
          { herkenbaar: r.herkenbaar, knuffel: r.knuffel, sterk: r.sterk },
        ]),
      );
    },
  });
  const mine = useQuery({
    queryKey: ["article-mine", uid],
    enabled: !!uid,
    queryFn: async () => {
      const [saves, reads, reactions] = await Promise.all([
        supabase.from("article_saves").select("article_id").eq("user_id", uid!),
        supabase.from("article_reads").select("article_id").eq("user_id", uid!),
        supabase.from("article_reactions").select("article_id, kind").eq("user_id", uid!),
      ]);
      return {
        saved: new Set((saves.data ?? []).map((r) => r.article_id)),
        read: new Set((reads.data ?? []).map((r) => r.article_id)),
        reacted: new Set((reactions.data ?? []).map((r) => `${r.article_id}:${r.kind}`)),
      };
    },
  });
  return {
    stories: stories.data ?? [],
    isLoading: stories.isLoading,
    counts: counts.data ?? new Map<string, ReactionCounts>(),
    saved: mine.data?.saved ?? new Set<string>(),
    read: mine.data?.read ?? new Set<string>(),
    reacted: mine.data?.reacted ?? new Set<string>(),
  };
}

/** Actions on a story: react, save and mark as read. Counts update right away and are then re-fetched. */
export function useStoryActions(uid: string | undefined) {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["article-reactions"] });
    qc.invalidateQueries({ queryKey: ["article-mine", uid] });
  };
  return {
    async toggleReaction(articleId: string, kind: ReactionKind, on: boolean) {
      if (!uid) return;
      qc.setQueryData<Map<string, ReactionCounts>>(["article-reactions"], (old) => {
        const next = new Map(old);
        const c = { ...(next.get(articleId) ?? NO_REACTIONS) };
        c[kind] = Math.max(0, c[kind] + (on ? -1 : 1));
        return next.set(articleId, c);
      });
      const { error } = on
        ? await supabase
            .from("article_reactions")
            .delete()
            .eq("article_id", articleId)
            .eq("user_id", uid)
            .eq("kind", kind)
        : await supabase
            .from("article_reactions")
            .insert({ article_id: articleId, user_id: uid, kind });
      if (error) toast.error("Dat lukte niet, probeer het opnieuw.");
      refresh();
    },
    async toggleSave(articleId: string, on: boolean) {
      if (!uid) return;
      const { error } = on
        ? await supabase
            .from("article_saves")
            .delete()
            .eq("article_id", articleId)
            .eq("user_id", uid)
        : await supabase.from("article_saves").insert({ article_id: articleId, user_id: uid });
      if (error) toast.error("Dat lukte niet, probeer het opnieuw.");
      else
        toast.success(
          on ? "Niet meer bewaard" : "Bewaard ⭐ Je vindt het terug bij Ontdekken → Bewaard.",
        );
      refresh();
    },
    async markRead(articleId: string) {
      if (!uid) return;
      await supabase
        .from("article_reads")
        .upsert(
          { article_id: articleId, user_id: uid },
          { onConflict: "article_id,user_id", ignoreDuplicates: true },
        );
      qc.invalidateQueries({ queryKey: ["article-mine", uid] });
    },
  };
}
