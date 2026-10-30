import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CHAT_GAMES, type ChatGameId, type ChatGameRow } from "@/lib/chat-games";
import type { Json } from "@/integrations/supabase/types";

/** One game in a chat, shared by its card in the chat and the game screen. */
export function useChatGame(id: string | null | undefined) {
  return useQuery({
    queryKey: ["chat-game", id],
    enabled: !!id,
    queryFn: async () =>
      ((await supabase.from("chat_games").select("*").eq("id", id!).maybeSingle()).data ??
        null) as ChatGameRow | null,
  });
}

/** Keeps every game in this chat live: a move by the other player shows up straight away. */
export function useChatGamesLive(scope: { groupId: string } | { convId: string }) {
  const qc = useQueryClient();
  const filter =
    "groupId" in scope ? `group_id=eq.${scope.groupId}` : `conversation_id=eq.${scope.convId}`;
  useEffect(() => {
    const ch = supabase
      .channel(`games-${filter}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_games", filter },
        (p) => {
          const id = (p.new as { id?: string } | null)?.id;
          qc.invalidateQueries({ queryKey: id ? ["chat-game", id] : ["chat-game"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [filter, qc]);
}

/** Starts a game and posts it in the chat. Returns the new game and its chat message. */
export async function startChatGame(
  game: ChatGameId,
  scope: { groupId: string } | { convId: string },
) {
  const g = CHAT_GAMES[game];
  const inGroup = "groupId" in scope;
  const { data, error } = await supabase.rpc("start_chat_game", {
    _game: game,
    _group: inGroup ? scope.groupId : null,
    _conv: inGroup ? null : scope.convId,
    _state: g.start() as unknown as Json,
    _body: inGroup
      ? `${g.emoji} ${g.name}: wie speelt mee?`
      : `${g.emoji} Ik daag je uit voor ${g.name}!`,
  });
  if (error) throw error;
  return data as { game_id: string; message_id: string };
}
