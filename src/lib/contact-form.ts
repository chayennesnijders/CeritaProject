/** Who is writing via the public contact form. */
export const SENDER_TYPES = [
  { id: "ouder", emoji: "👨‍👩‍👧", label: "Ouder of verzorger" },
  { id: "organisatie", emoji: "🤝", label: "Organisatie" },
  { id: "jongere", emoji: "🙋", label: "Jongere" },
  { id: "anders", emoji: "💬", label: "Iets anders" },
] as const;
export type SenderType = (typeof SENDER_TYPES)[number]["id"];
export const senderType = (id: unknown): SenderType =>
  SENDER_TYPES.find((t) => t.id === id)?.id ?? "anders";
export const senderLabel = (id: string) =>
  SENDER_TYPES.find((t) => t.id === id)?.label ?? "Iets anders";

export const isEmail = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim());

/** Everything filled in correctly, and the hidden spam trap left empty. */
export function contactReady(f: { name: string; email: string; body: string; trap: string }) {
  return (
    f.trap === "" && f.name.trim().length >= 1 && isEmail(f.email) && f.body.trim().length >= 5
  );
}
