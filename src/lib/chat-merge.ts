/**
 * Put one new chat message into a list that is already on screen, without
 * fetching the whole conversation again. Ignores a message that is already
 * there (your own message also comes back through the live channel).
 */
export function addMessage<T extends { id: string; created_at: string }>(
  list: T[],
  row: T,
  order: "oldest-first" | "newest-first" = "oldest-first",
): T[] {
  if (list.some((m) => m.id === row.id)) return list;
  const next = [...list, row].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return order === "oldest-first" ? next : next.reverse();
}

/** How many messages a chat loads at first; older ones load on request. */
export const CHAT_PAGE = 60;
