/** A clear Dutch message for why saving a new password failed (Supabase error code or message). */
export function newPasswordError(err: {
  code?: string | undefined;
  message?: string | undefined;
}): string {
  const code = err.code ?? "";
  const msg = (err.message ?? "").toLowerCase();
  if (code === "same_password" || msg.includes("different from the old"))
    return "Dit is je oude wachtwoord. Kies een nieuw wachtwoord dat anders is.";
  if (code === "weak_password" || msg.includes("weak") || msg.includes("at least"))
    return "Dit wachtwoord is te zwak. Kies er een van minstens 8 tekens, met letters en cijfers.";
  if (code === "session_not_found" || code === "bad_jwt" || msg.includes("session"))
    return "De link is verlopen of al gebruikt. Vraag een nieuwe link aan via ‘Wachtwoord vergeten’.";
  return "Dat lukte niet. Vraag opnieuw een link aan via ‘Wachtwoord vergeten’.";
}
