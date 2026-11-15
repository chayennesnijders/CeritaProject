/**
 * Messages for a chat request that could not be sent. New accounts wait 3 days before they can
 * start a private chat with someone under 18 (wait_new_account_requests in update 64).
 */
export const NEW_ACCOUNT_DAYS = 3;

export function chatRequestError(e: { code?: string; hint?: string | null; message?: string } | null | undefined): string {
  if (e?.hint === "nieuw-account")
    return `Je account is nog nieuw. De eerste ${NEW_ACCOUNT_DAYS} dagen kun je nog geen privéchat starten met jongeren onder de 18. Doe intussen gerust mee in de groepen!`;
  if (e?.code === "23505") return "Jullie hebben al een gesprek of verzoek. Kijk bij Berichten.";
  return "Verzoek sturen lukte niet. Probeer het later opnieuw.";
}
