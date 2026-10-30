/** Members can ask for a return up to this many days after ordering (14 days after receiving it, plus delivery time). */
export const RETURN_DAYS = 30;

export const RETURN_STATUS: Record<string, { label: string; member: string }> = {
  aangevraagd: {
    label: "Aangevraagd",
    member: "We hebben je aanvraag. Je krijgt binnen 2 werkdagen een mail met het retouradres.",
  },
  adres_gestuurd: {
    label: "Adres gemaild",
    member:
      "We hebben je het retouradres gemaild. Stuur het pakketje op en bewaar je verzendbewijs.",
  },
  ontvangen: {
    label: "Pakketje ontvangen",
    member: "Je pakketje is binnen! We betalen je zo snel mogelijk terug.",
  },
  terugbetaald: {
    label: "Terugbetaald",
    member: "Je geld is teruggestort. Het kan een paar dagen duren voordat je het ziet.",
  },
  afgewezen: {
    label: "Afgewezen",
    member: "Je retour is helaas afgewezen. Je hebt een mail gekregen met de uitleg.",
  },
};
export const returnStatus = (s: string) => RETURN_STATUS[s] ?? RETURN_STATUS["aangevraagd"]!;

/** A paid order can be returned once, within RETURN_DAYS. */
export function canReturn(
  order: { kind: string; created_at: string },
  hasReturn: boolean,
  now: Date = new Date(),
) {
  if (order.kind !== "paid" || hasReturn) return false;
  return now.getTime() - Date.parse(order.created_at) <= RETURN_DAYS * 86_400_000;
}

/** Test payments (cs_test_…) are refunded in Stripe's test mode, real ones in live mode. */
export const stripeEnvironmentFor = (sessionId: string | null | undefined) =>
  sessionId?.startsWith("cs_live_") ? ("live" as const) : ("sandbox" as const);

/** Ready-made e-mail to the member with the return address. */
export function returnAddressMail(product: string, name: string) {
  const subject = `Je retour bij CeritaProject: ${product}`;
  const body = [
    `Hoi ${name},`,
    "",
    `Je wilt ${product} terugsturen. Dat kan! Stuur het pakketje naar:`,
    "",
    "[ADRES]",
    "",
    "Stuur het product ongebruikt en in de originele verpakking terug. De verzendkosten voor het terugsturen betaal je zelf. Bewaar je verzendbewijs.",
    "Zodra het pakketje binnen is, betalen we het hele bedrag terug.",
    "",
    "Groetjes,",
    "CeritaProject",
  ].join("\n");
  return { subject, body };
}
