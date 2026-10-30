import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { chatGame } from "@/lib/chat-games";
import { eventTime } from "@/lib/events";
import { inboxItems, inboxTotal } from "@/lib/inbox";
import { useUnreadCounts } from "@/lib/unread";
import { useNewCompliments } from "@/lib/use-compliments";

/** Everything for the bell and the Meldingen page, from what the app already knows. */
export function useInbox() {
  const { data: me } = useMe();
  const uid = me?.user.id;
  const unread = useUnreadCounts();
  const compliments = useNewCompliments(uid);
  const { data: extra } = useQuery({
    queryKey: ["inbox-extra", uid],
    enabled: !!uid,
    refetchInterval: 60_000,
    queryFn: async () => {
      const soon = new Date(Date.now() + 24 * 3600_000).toISOString();
      const [answers, games, letters, replies, rsvps] = await Promise.all([
        supabase
          .from("anon_questions")
          .select("id")
          .eq("user_id", uid!)
          .eq("status", "beantwoord")
          .eq("answer_seen", false),
        supabase
          .from("chat_games")
          .select("id, game, group_id, conversation_id")
          .eq("status", "bezig")
          .eq("turn", uid!),
        supabase.rpc("my_letters"),
        supabase
          .from("admin_messages")
          .select("id")
          .eq("user_id", uid!)
          .not("reply", "is", null)
          .eq("reply_seen", false),
        supabase
          .from("event_rsvps")
          .select("event:events(id, title, starts_at)")
          .eq("user_id", uid!),
      ]);
      return {
        answers: answers.data?.length ?? 0,
        myTurn: (games.data ?? []).map((g) => ({
          id: g.id,
          game: chatGame(g.game)
            ? `${chatGame(g.game)!.emoji} ${chatGame(g.game)!.name}`
            : "Spelletje",
          where: g.group_id
            ? `/community/${g.group_id}?spel=${g.id}`
            : `/berichten/${g.conversation_id}?spel=${g.id}`,
        })),
        letters: (letters.data ?? []).filter((l) => l.body && !l.opened_at).length,
        replies: replies.data?.length ?? 0,
        meetups: (rsvps.data ?? [])
          .map((r) => r.event as unknown as { id: string; title: string; starts_at: string } | null)
          .filter(
            (e): e is { id: string; title: string; starts_at: string } =>
              !!e && e.starts_at > new Date().toISOString() && e.starts_at < soon,
          )
          .map((e) => ({ id: e.id, title: e.title, when: eventTime(e.starts_at) })),
      };
    },
  });
  const items = inboxItems({
    dms: unread.dmTotal,
    requests: unread.requests,
    groups: unread.groupTotal,
    compliments,
    answers: extra?.answers ?? 0,
    myTurn: extra?.myTurn ?? [],
    letters: extra?.letters ?? 0,
    replies: extra?.replies ?? 0,
    meetups: extra?.meetups ?? [],
  });
  return { items, total: inboxTotal(items) };
}
