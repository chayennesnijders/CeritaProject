/**
 * "CeritaProject op school": a pack young people use to introduce CeritaProject and its mentor lessons
 * to their own secondary school, mbo or hbo (public page /schoolpakket, printable as PDF).
 * Never for primary schools, never asks for other pupils' details.
 */

export const SCHOOL_LINKS = {
  lessons: "https://app.ceritaproject.nl/lessen",
  contact: "https://app.ceritaproject.nl/contact-ons",
  app: "https://app.ceritaproject.nl",
} as const;

/** Who at school to ask. */
export const SCHOOL_WHO = [
  { emoji: "🧑‍🏫", who: "Je mentor", why: "Die geeft vaak de mentorlessen en kent je klas." },
  { emoji: "🤝", who: "De vertrouwenspersoon of zorgcoördinator", why: "Die zorgt op school voor hoe het met leerlingen gaat." },
  { emoji: "🗳️", who: "De leerlingenraad", why: "Samen sta je sterker, en de raad kan het aan de schoolleiding voorstellen." },
] as const;

/** The four steps, in order. */
export const SCHOOL_STEPS = [
  { title: "Kies met wie je praat", text: "Je mentor, de vertrouwenspersoon of de leerlingenraad. Eén persoon is genoeg om te beginnen." },
  { title: "Stuur de brief", text: "Kopieer de brief hieronder, vul de naam in en stuur hem via de mail of Magister. Of print hem en geef hem af." },
  { title: "Geef de uitleg mee", text: "Print de uitleg voor school (onderaan deze pagina) of stuur de link van deze pagina mee." },
  { title: "Laat school de lessen bekijken", text: "Op app.ceritaproject.nl/lessen staan de mentorlessen. Daar kan school ook contact met ons opnemen." },
] as const;

/** The letter. [naam] and [jouw naam] are filled in by the young person themselves. */
export function schoolLetter(to: string, from: string): string {
  const name = to.trim() || "[naam]";
  const me = from.trim() || "[jouw naam]";
  return [
    `Beste ${name},`,
    "",
    "Ik wil u iets laten zien waarvan ik denk dat het goed is voor onze school: CeritaProject.",
    "",
    "CeritaProject maakt kant-en-klare mentorlessen over welzijn, met dia's, een handleiding en werkbladen. Ze gaan over onderwerpen waar veel jongeren mee zitten, zoals je goed voelen, vriendschap en online en offline. U kunt ze zelf geven, zonder uren voorbereiding.",
    "",
    "Er komt ook een veilige app voor jongeren van 13 tot 27, met groepen per leeftijd, een privé dagboek en echte verhalen van jongeren.",
    "",
    `De lessen kunt u bekijken op ${SCHOOL_LINKS.lessons}. Daar kunt u ook contact opnemen met de makers.`,
    "",
    "Zou u ernaar willen kijken? Ik vertel er graag meer over.",
    "",
    "Groetjes,",
    me,
  ].join("\n");
}

/** What school may ask, with honest answers. */
export const SCHOOL_QUESTIONS = [
  { q: "Wat is CeritaProject?", a: "Een project voor jongeren van 13 tot 27: mentorlessen over welzijn voor scholen, en een veilige app waar jongeren met leeftijdsgenoten praten, in hun dagboek schrijven en echte verhalen lezen." },
  { q: "Wat zit er in de lessen?", a: "Per les dia's, een handleiding voor de docent en werkbladen voor de klas. Er zijn lessen voor de onderbouw (klas 1 t/m 3) en de bovenbouw (klas 4 t/m 6)." },
  { q: "Is de app veilig?", a: "Jongeren praten alleen met hun eigen leeftijdsgroep (13–15, 16–25, 26–27). Gemene woorden worden weggefilterd, er zijn coaches en beheerders, en de app waarschuwt als iemand om een telefoonnummer, adres of foto's vraagt." },
  { q: "Wat gebeurt er met gegevens van leerlingen?", a: "School geeft geen gegevens van leerlingen door. Docenten zien in de app nooit wat leerlingen schrijven. Alles staat in de privacyverklaring op app.ceritaproject.nl/privacy." },
  { q: "Wat kost het?", a: "Scholen werken met een schoollicentie. Wat dat voor jullie school betekent, horen jullie via app.ceritaproject.nl/lessen of contact-ons." },
  { q: "Moeten leerlingen de app gebruiken?", a: "Nee. De lessen werken ook zonder app. De app is een vrije keuze; onder de 16 doen jongeren het samen met hun ouder of verzorger." },
] as const;

/** Rules for the young person. */
export const SCHOOL_RULES = [
  "Doe dit alleen bij je eigen school, mbo of hbo, en niet bij basisscholen.",
  "Vraag altijd eerst of het mag, voordat je iets ophangt of uitdeelt.",
  "Verzamel nooit namen, nummers of andere gegevens van klasgenoten.",
  "Zegt school nee of nog niet? Dat is oké. Je hebt het in elk geval gevraagd. 💗",
] as const;

/** The one-page explanation for school (printed). */
export const SCHOOL_SHEET = {
  title: "CeritaProject voor scholen",
  intro: "Kant-en-klare mentorlessen over welzijn, en een veilige app voor jongeren van 13 tot 27.",
  points: [
    ["📚", "Mentorlessen met dia's, handleiding en werkbladen, voor de onderbouw en de bovenbouw."],
    ["⏱️", "Je geeft ze zelf, zonder uren voorbereiding."],
    ["💬", "Onderwerpen waar jongeren echt mee zitten: je goed voelen, vriendschap, online en offline."],
    ["🛡️", "Een app met groepen per leeftijd, een filter op gemene woorden, coaches en een privé dagboek."],
    ["🔒", "School geeft geen leerlinggegevens door; docenten zien nooit wat leerlingen schrijven."],
  ],
} as const;
