/** The compliments members can send (number = id in the database, 1 to 24). Only kind words, so nobody can be hurt. */
export const COMPLIMENTS: Record<number, { emoji: string; text: string }> = {
  1: { emoji: "🌟", text: "Je bent een lichtpuntje" },
  2: { emoji: "😊", text: "Je maakt mensen blij" },
  3: { emoji: "💪", text: "Je bent sterker dan je denkt" },
  4: { emoji: "👂", text: "Je kunt heel goed luisteren" },
  5: { emoji: "😂", text: "Je bent echt grappig" },
  6: { emoji: "🎨", text: "Je bent zo creatief" },
  7: { emoji: "🤗", text: "Je bent een fijne vriend(in)" },
  8: { emoji: "🌈", text: "Je bent goed zoals je bent" },
  9: { emoji: "🧠", text: "Je hebt slimme ideeën" },
  10: { emoji: "💛", text: "Je hebt een groot hart" },
  11: { emoji: "🦁", text: "Je bent dapper" },
  12: { emoji: "✨", text: "Je straalt" },
  13: { emoji: "🌻", text: "Je maakt de groep gezellig" },
  14: { emoji: "🙌", text: "Je helpt anderen echt" },
  15: { emoji: "🎶", text: "Je hebt een goede smaak" },
  16: { emoji: "🌱", text: "Je groeit elke dag" },
  17: { emoji: "🫶", text: "Je bent lief voor anderen" },
  18: { emoji: "🔥", text: "Je bent een doorzetter" },
  19: { emoji: "☀️", text: "Je bent een zonnetje" },
  20: { emoji: "📚", text: "Je schrijft mooi" },
  21: { emoji: "🦋", text: "Je bent uniek" },
  22: { emoji: "🏆", text: "Je mag trots zijn op jezelf" },
  23: { emoji: "🍀", text: "Ik ben blij dat je hier bent" },
  24: { emoji: "💐", text: "Je verdient het beste" },
};
export const COMPLIMENT_IDS = Object.keys(COMPLIMENTS).map(Number);
/** Pastel card colours for the wall. */
export const WALL_COLORS = ["#fde2e4", "#fff1c1", "#d8f3dc", "#dbeafe", "#ede9fe", "#ffe5d0"];
export const wallColor = (id: string) =>
  WALL_COLORS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % WALL_COLORS.length]!;

/** Remembers (on this device) when you last looked at your wall, so the home page can show what is new. */
export const complimentsSeenKey = (uid: string) => `cerita-complimenten-gezien-${uid}`;

/** Compliments that arrived after you last opened your wall (all of them if you never did). */
export const newCompliments = <T extends { created_at: string }>(
  wall: T[],
  seenAt: string | null,
) => wall.filter((c) => !seenAt || c.created_at > seenAt);

/** "Iemand gaf je een compliment!" or "Je kreeg 3 nieuwe complimenten!" */
export const newComplimentsText = (n: number) =>
  n === 1 ? "Iemand gaf je een compliment!" : `Je kreeg ${n} nieuwe complimenten!`;
