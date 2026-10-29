import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { unreadNews, type NewsItem } from "@/lib/admin-news";

/** Nieuws for admins plus when you last looked; `uid` only for admins (undefined turns it off). */
export function useAdminNews(uid: string | undefined) {
  const qc = useQueryClient();
  const news = useQuery({
    queryKey: ["admin-news", uid],
    enabled: !!uid,
    refetchInterval: 60_000,
    queryFn: async () =>
      ((await supabase.rpc("admin_news", { _days: 30 })).data ?? []) as NewsItem[],
  });
  const seen = useQuery({
    queryKey: ["admin-news-seen", uid],
    enabled: !!uid,
    queryFn: async () =>
      (
        await supabase
          .from("admin_news_seen")
          .select("seen_at, push")
          .eq("user_id", uid!)
          .maybeSingle()
      ).data ?? null,
  });
  const items = news.data ?? [];
  const seenAt = seen.data?.seen_at ?? null;
  return {
    items,
    seenAt,
    isLoading: news.isLoading || seen.isLoading,
    unread: uid ? unreadNews(items, seenAt) : 0,
    push: seen.data?.push ?? false,
    refreshSeen: () => qc.invalidateQueries({ queryKey: ["admin-news-seen", uid] }),
    async markSeen() {
      if (!uid) return;
      await supabase
        .from("admin_news_seen")
        .upsert({ user_id: uid, seen_at: new Date().toISOString() });
      qc.invalidateQueries({ queryKey: ["admin-news-seen", uid] });
    },
  };
}
