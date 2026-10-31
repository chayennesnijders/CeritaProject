/** Usernames: 3–20 lowercase letters, digits, _ or . (same rule as the profiles.username check). */
export const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;

/** What someone types → what we store: lowercase, no leading @, no spaces or other signs. */
export function normalizeUsername(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9_.]/g, "");
}

/** A friendly Dutch message when the username is not allowed, or null when it is fine. */
export function usernameProblem(username: string): string | null {
  if (!username) return "Vul een gebruikersnaam in.";
  if (username.length < 3) return "Je gebruikersnaam moet minstens 3 tekens hebben.";
  if (!USERNAME_RE.test(username))
    return "Gebruik 3 tot 20 tekens: alleen letters, cijfers, _ en .";
  return null;
}

/** "Chayenne (@chay)" for admin lists, or just the name when there is no username yet. */
export function nameWithUsername(
  name: string | null | undefined,
  username: string | null | undefined,
) {
  const n = name?.trim() || "Lid";
  return username ? `${n} (@${username})` : n;
}
