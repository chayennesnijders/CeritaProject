/**
 * Signs that someone tries to take a conversation outside the app or close to a young person:
 * asking for a phone number, another app, photos, an address or a meeting, or to keep it secret.
 * This is how grooming usually starts. The same pattern runs in the database
 * (public.contact_risk, update-51) so admins hear about it even when the app is bypassed.
 * Kept to constructs that mean the same in JavaScript and PostgreSQL regular expressions (no \b).
 */
export const CONTACT_PATTERNS = {
  nummer:
    "((^|[^0-9])(\\+31|0031|0)6[ -]?[0-9]{8}|(stuur|geef|wat is|mag ik)\\s+(\\S+\\s+){0,2}(je|jouw|ur)\\s+(nummer|telefoonnummer|06))",
  app: "((add|voeg)\\s+(\\S+\\s+){0,2}(me|mij)\\s+(\\S+\\s+){0,2}(op|on|via)\\s+(snap|snapchat|insta|instagram|whatsapp|telegram|discord|kik)|(wat is|geef|stuur)\\s+(\\S+\\s+){0,2}(je|jouw|ur)\\s+(snap|snapchat|insta|instagram|telegram|discord)|(praten|appen|chatten|verder)\\s+(\\S+\\s+){0,3}(op|via)\\s+(snap|snapchat|whatsapp|telegram|insta|instagram|discord|kik))",
  foto: "((stuur|send|maak)\\s+(\\S+\\s+){0,3}(foto|fotootje|pic|selfie|plaatje|filmpje)\\s+(\\S+\\s+){0,2}(van jou|van je|van jezelf)|nudes?|naaktfoto|(stuur|send)\\s+(\\S+\\s+){0,2}(nudes?|pics?))",
  afspreken:
    "(waar woon je|wat is je adres|in welke straat|op welke school zit je|(zullen|wil je|kom je|gaan)\\s+(\\S+\\s+){0,3}afspreken|ik kom\\s+(\\S+\\s+){0,2}(naar je|bij je)|(webcam|videobellen|facetimen))",
  geheim:
    "(ons geheim|ons geheimpje|(niet|nooit)\\s+(\\S+\\s+){0,4}(tegen|aan)\\s+(je\\s+)?(ouders|moeder|vader|mama|papa|mentor)\\s+(\\S+\\s+){0,2}(zeggen|vertellen)|hoe oud ben je (echt|eigenlijk))",
} as const;
export type ContactRisk = keyof typeof CONTACT_PATTERNS;

/** All patterns together, as the database uses it. */
export const CONTACT_PATTERN = `(${Object.values(CONTACT_PATTERNS).join("|")})`;

const compiled = Object.entries(CONTACT_PATTERNS).map(([k, p]) => [k as ContactRisk, new RegExp(p, "i")] as const);

/** Which kinds of risk a message shows (empty when none). */
export function contactRisks(text: string | null | undefined): ContactRisk[] {
  const t = text ?? "";
  return compiled.filter(([, re]) => re.test(t)).map(([k]) => k);
}

/** What the writer sees before sending (a nudge, never a block). */
export const SENDER_NOTE: Record<ContactRisk, string> = {
  nummer: "Je deelt of vraagt een telefoonnummer.",
  app: "Je wilt verder praten op een andere app.",
  foto: "Het gaat over foto's van iemand.",
  afspreken: "Het gaat over afspreken, adressen of school.",
  geheim: "Het gaat over geheimhouden of iemands echte leeftijd.",
};

/** What a young receiver sees under such a message. */
export const RECEIVER_NOTE =
  "Let op: dit bericht vraagt om contactgegevens, foto's, een afspraak of geheimhouding. Je hoeft daar nooit op in te gaan. Voelt het niet goed? Blokkeer of meld, en praat erover met iemand die je vertrouwt.";
