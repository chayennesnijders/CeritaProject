/** What a member can write to the admins about. */
export const MESSAGE_TOPICS = [
  { id: "vraag", emoji: "❓", label: "Een vraag" },
  { id: "idee", emoji: "💡", label: "Een idee" },
  { id: "probleem", emoji: "🛠️", label: "Iets werkt niet" },
  { id: "iets-anders", emoji: "💬", label: "Iets anders" },
] as const;
export type MessageTopic = (typeof MESSAGE_TOPICS)[number]["id"];
export const topicInfo = (id: string) =>
  MESSAGE_TOPICS.find((t) => t.id === id) ?? MESSAGE_TOPICS[3];

export const MESSAGE_STATUS: Record<string, { label: string; cls: string }> = {
  nieuw: { label: "Nieuw", cls: "bg-primary text-primary-foreground" },
  gelezen: { label: "Gelezen", cls: "bg-muted" },
  beantwoord: { label: "Beantwoord ✓", cls: "bg-emerald-100 text-emerald-800" },
};

/** Answers you have not seen yet (for the dot on the button). */
export const unseenReplies = (rows: { reply: string | null; reply_seen: boolean }[]) =>
  rows.filter((r) => r.reply && !r.reply_seen).length;
