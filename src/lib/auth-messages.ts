/** Supabase's English auth errors in plain Dutch, with what to do next. */
export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Je e-mail of wachtwoord klopt niet. Kijk of er geen typfout in zit.";
  if (m.includes("email not confirmed"))
    return "Je e-mail is nog niet bevestigd. Klik op de link in de mail, of vraag hieronder een nieuwe aan.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Dit e-mailadres heeft al een account. Log in, of kies ‘Wachtwoord vergeten?’.";
  if (m.includes("password should be at least") || m.includes("weak password"))
    return "Kies een langer of sterker wachtwoord (minimaal 8 tekens).";
  if (m.includes("rate limit") || m.includes("too many") || m.includes("security purposes"))
    return "Even wachten: er is net al een poging gedaan. Probeer het over een minuut opnieuw.";
  if (m.includes("invalid email") || m.includes("unable to validate email"))
    return "Dat lijkt geen geldig e-mailadres. Kijk even of het klopt.";
  if (m.includes("failed to fetch") || m.includes("network")) return "Geen verbinding. Kijk of je internet aan staat.";
  return message || "Er ging iets mis. Probeer het opnieuw.";
}

/** How far a new password is, for the little bar while signing up. */
export function passwordProgress(pw: string, min = 8): { pct: number; left: number; ok: boolean } {
  const left = Math.max(0, min - pw.length);
  return { pct: Math.min(100, Math.round((pw.length / min) * 100)), left, ok: left === 0 };
}
