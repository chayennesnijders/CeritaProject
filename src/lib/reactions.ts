/** The emojis you can react with (same list as the database check). */
export const REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "🙏"] as const;
export type Reaction = {
  emoji: string;
  user_id: string;
  post_id?: string | null;
  message_id?: string | null;
};

/** Reactions on one message, grouped per emoji (most first), and which one is yours. */
export function summarize(reactions: Reaction[], uid: string | undefined) {
  const counts = new Map<string, number>();
  for (const r of reactions) counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
  const list = [...counts]
    .map(([emoji, count]) => ({ emoji, count }))
    .sort((a, b) => b.count - a.count);
  return { list, mine: reactions.find((r) => r.user_id === uid)?.emoji ?? null };
}

/** Groups a flat list of reactions per message id. */
export function byMessage(reactions: Reaction[]) {
  const map = new Map<string, Reaction[]>();
  for (const r of reactions) {
    const id = r.post_id ?? r.message_id;
    if (!id) continue;
    map.set(id, [...(map.get(id) ?? []), r]);
  }
  return map;
}
