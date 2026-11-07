/** What /bevestig shows for each kind of email link, and where it goes after the tap. */
export type ConfirmType = "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email";

const KINDS: Record<ConfirmType, { title: string; button: string; next: "/home" | "/reset-password" | "/profiel"; done: string }> = {
  signup: { title: "Bevestig je account", button: "Bevestig mijn account", next: "/home", done: "Je account is bevestigd 🎉" },
  email: { title: "Bevestig je e-mailadres", button: "Bevestig mijn e-mailadres", next: "/home", done: "Je e-mailadres is bevestigd 🎉" },
  invite: { title: "Welkom bij CeritaProject", button: "Uitnodiging accepteren", next: "/home", done: "Welkom! 🎉" },
  magiclink: { title: "Inloggen", button: "Log mij in", next: "/home", done: "Je bent ingelogd" },
  recovery: { title: "Nieuw wachtwoord kiezen", button: "Verder naar nieuw wachtwoord", next: "/reset-password", done: "Kies nu je nieuwe wachtwoord" },
  email_change: { title: "Bevestig je nieuwe e-mailadres", button: "Bevestig mijn nieuwe e-mailadres", next: "/profiel", done: "Je e-mailadres is bevestigd" },
};

export function readConfirmLink(search: string): { tokenHash: string; type: ConfirmType } | null {
  const q = new URLSearchParams(search);
  const tokenHash = q.get("token_hash") ?? "";
  const type = q.get("type") ?? "";
  if (!tokenHash || !(type in KINDS)) return null;
  return { tokenHash, type: type as ConfirmType };
}

export const confirmKind = (type: ConfirmType) => KINDS[type];

/** Supabase's reason in plain Dutch, with what to do. */
export function confirmError(message: string, type: ConfirmType): string {
  const m = message.toLowerCase();
  if (m.includes("expired") || m.includes("invalid") || m.includes("not found"))
    return type === "recovery"
      ? "Deze link is verlopen of al gebruikt. Vraag hieronder een nieuwe aan."
      : "Deze link is verlopen of al gebruikt. Probeer in te loggen; lukt dat niet, vraag dan een nieuwe bevestigingsmail aan.";
  return `Dat lukte niet: ${message}`;
}
