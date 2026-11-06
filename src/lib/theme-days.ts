/**
 * Special days (from the themadagen-kalender, Dec 2026 – Nov 2027): on such a day young people,
 * parents and teachers each get their own tip. `popup` days also show a pop-up once; the others
 * only a card. Weeks without a confirmed date yet are left out until it is known.
 * Heavy themes follow 113's guidelines: no details, hope and help first, always a help line.
 */
export type ThemeAudience = "jongeren" | "ouders" | "leraren";
export type ThemeDay = {
  from: string; // YYYY-MM-DD
  to?: string; // last day, inclusive
  emoji: string;
  title: string;
  popup?: boolean;
  jongeren: string;
  ouders: string;
  leraren?: string;
  help?: string;
};

export const THEME_DAYS: ThemeDay[] = [
  { from: "2026-11-25", to: "2026-12-10", emoji: "🧡", title: "Orange the World", jongeren: "Gezonde liefde voelt veilig. Twijfel je? Praat erover, ook anoniem.", ouders: "Praat met je kind over wat een gezonde relatie is, en wat niet.", leraren: "Bespreek in de klas: wat is controle in een relatie, en wat is liefde?" },
  { from: "2026-12-03", emoji: "♿", title: "Internationale dag van mensen met een beperking", jongeren: "Iedereen draagt iets wat je niet ziet. Wees vandaag extra mild.", ouders: "Vraag je kind hoe het met vrienden met een beperking gaat op school.", leraren: "Check of iedere leerling echt mee kan doen, ook bij uitjes en groepswerk." },
  { from: "2026-12-05", emoji: "🎁", title: "Sinterklaas", jongeren: "Schrijf een lief gedichtje voor iemand die het nodig heeft.", ouders: "Niet ieder gezin viert het: let op jongeren voor wie dit een lastige tijd is.", leraren: "Let bij surprises op gedichten die stiekem kwetsen." },
  { from: "2026-12-24", to: "2026-12-26", emoji: "🎄", title: "Kerst", popup: true, jongeren: "Voelt kerst zwaar? Je bent niet de enige. Plan iets kleins voor jezelf.", ouders: "Vraag je kind wat het nodig heeft deze dagen, niet alleen wat het wil hebben.", leraren: "Vraag voor de vakantie: ‘Heb je iemand bij wie je terecht kunt in de vakantie?’", help: "Kindertelefoon 0800-0432 · 113: 0800-0113" },
  { from: "2026-12-31", emoji: "✨", title: "Oud en nieuw", popup: true, jongeren: "Geen goede voornemens nodig. Schrijf op wat je dit jaar wél hebt overleefd.", ouders: "Benoem iets waar je trots op bent bij je kind, uit het afgelopen jaar." },
  { from: "2027-02-04", emoji: "🎗️", title: "Wereld Kankerdag", jongeren: "Heeft iemand om je heen kanker? Je gevoelens mogen er allemaal zijn.", ouders: "Vertel eerlijk, op maat van je kind, als er kanker in de familie is.", leraren: "Weet welke leerlingen een zieke ouder hebben; zij dragen vaak meer dan je ziet." },
  { from: "2027-02-14", emoji: "💗", title: "Valentijnsdag", jongeren: "Liefde begint bij jezelf. Schrijf drie dingen op die je aan jezelf waardeert.", ouders: "Vertel je kind gewoon dat je van hem of haar houdt, zonder reden.", leraren: "Valentijn kan pijnlijk zijn voor wie niets krijgt; houd het luchtig in de klas." },
  { from: "2027-03-01", emoji: "💐", title: "Nationale Complimentendag", popup: true, jongeren: "Geef vandaag een anoniem compliment in de app.", ouders: "Geef je kind een compliment over wie het is, niet over wat het doet.", leraren: "Schrijf drie leerlingen een kort, persoonlijk compliment." },
  { from: "2027-03-08", emoji: "👩", title: "Internationale Vrouwendag", jongeren: "Welke vrouw inspireert jou? Vertel het haar.", ouders: "Praat thuis over verwachtingen voor jongens en meisjes.", leraren: "Laat leerlingen een vrouw kiezen die zij bewonderen, en waarom." },
  { from: "2027-03-19", emoji: "😴", title: "Wereld Slaapdag", jongeren: "Telefoon een half uur eerder weg. Probeer het vanavond.", ouders: "Maak samen een afspraak over telefoons in de slaapkamer.", leraren: "Vraag de klas hoe laat ze slapen; slaap en cijfers hangen samen." },
  { from: "2027-03-21", emoji: "✊", title: "Internationale dag tegen racisme", jongeren: "Heb je iets gezien of meegemaakt? Je mag het melden.", ouders: "Vraag je kind of het weleens wordt buitengesloten om wie het is.", leraren: "Spreek racistische grapjes direct aan, ook als het ‘maar een grapje’ is." },
  { from: "2027-04-02", emoji: "♾️", title: "Wereld Autisme Dag", jongeren: "Anders denken is geen fout. Wat heb jij nodig om je goed te voelen?", ouders: "Vraag je kind met autisme wat het fijn vindt, in plaats van in te vullen.", leraren: "Geef vooraf duidelijkheid over veranderingen in het rooster." },
  { from: "2027-04-27", emoji: "🧡", title: "Koningsdag", jongeren: "Te druk? Het is oké om eerder naar huis te gaan.", ouders: "Spreek vooraf af hoe je kind je kan bereiken als iets niet goed voelt." },
  { from: "2027-05-04", to: "2027-05-05", emoji: "🕊️", title: "Dodenherdenking en Bevrijdingsdag", jongeren: "Vrijheid is ook: jezelf mogen zijn. Waar voel jij je vrij?", ouders: "Praat over wat vrijheid voor jullie betekent.", leraren: "Bespreek: wie is er vandaag niet vrij om zichzelf te zijn?" },
  { from: "2027-05-09", emoji: "🌷", title: "Moederdag", jongeren: "Heb je geen fijne band met je moeder, of mis je haar? Dat gevoel mag er zijn.", ouders: "Een kaartje is fijn; samen tijd nog fijner.", leraren: "Houd rekening met leerlingen zonder moeder, of met een moeilijke band." },
  { from: "2027-05-17", emoji: "🏳️‍🌈", title: "Dag tegen homofobie en transfobie", jongeren: "Je bent goed zoals je bent. Er zijn mensen die je steunen.", ouders: "Laat je kind merken dat het altijd zichzelf mag zijn bij jou.", leraren: "Grijp in bij scheldwoorden als ‘homo’; dat raakt meer leerlingen dan je denkt." },
  { from: "2027-06-20", emoji: "👔", title: "Vaderdag", jongeren: "Mis je je vader, of is het ingewikkeld? Ook dat mag er zijn.", ouders: "Vraag je kind eens wat het van jou geleerd heeft; het antwoord kan je verrassen.", leraren: "Houd rekening met leerlingen zonder vader, of met een moeilijke band." },
  { from: "2027-07-01", emoji: "⛓️‍💥", title: "Keti Koti", jongeren: "Wat weet jij over je eigen geschiedenis? Vraag het eens aan familie.", ouders: "Praat samen over wat deze dag voor jullie familie betekent.", leraren: "Geef ruimte aan leerlingen voor wie deze dag persoonlijk is." },
  { from: "2027-08-12", emoji: "🌍", title: "Internationale Dag van de Jeugd", jongeren: "Wat zou jij veranderen als jij het voor het zeggen had?", ouders: "Vraag naar de mening van je kind over iets in het nieuws, en luister echt." },
  { from: "2027-09-10", emoji: "💛", title: "Wereld Suïcidepreventiedag", popup: true, jongeren: "Zie je het even niet meer zitten? Praat erover, of bel of chat anoniem met 113.", ouders: "Vraag het gewoon als je je zorgen maakt: ‘Denk je er weleens aan om er niet meer te willen zijn?’ Dat helpt, het brengt niemand op een idee.", leraren: "Weet wie op school de zorgcoördinator is, en wat het protocol is bij zorgen.", help: "113 Zelfmoordpreventie: 0800-0113 of 113.nl" },
  { from: "2027-10-05", emoji: "🍎", title: "Dag van de Leraar", jongeren: "Bedank een docent die het verschil maakte.", ouders: "Stuur de mentor van je kind een kort bedankje.", leraren: "Vandaag is jouw dag. Wat ging er dit jaar goed in jouw klas?" },
  { from: "2027-10-08", emoji: "💜", title: "Paarse Vrijdag", jongeren: "Draag iets paars als je wilt. Je bent niet alleen.", ouders: "Laat merken dat je kind thuis altijd zichzelf mag zijn.", leraren: "Doe mee met je school; zichtbaarheid helpt lhbtiq+-leerlingen echt." },
  { from: "2027-10-10", emoji: "🧠", title: "Wereld Mentale Gezondheidsdag", popup: true, jongeren: "Hoe gaat het écht met je? Kies vandaag je gevoel in de app.", ouders: "Doe de check-in samen: wat ging goed vandaag, en wat was zwaar?", leraren: "Begin de les met één vraag: ‘Hoe vol is je hoofd vandaag, van 1 tot 10?’ (anoniem)." },
  { from: "2027-10-11", emoji: "🌈", title: "Coming Out Day", jongeren: "Er is geen deadline. Jij bepaalt wanneer en aan wie je iets vertelt.", ouders: "Vertelt je kind iets over wie het is? Bedank het voor het vertrouwen.", leraren: "Gebruik de naam en voornaamwoorden die een leerling zelf kiest." },
  { from: "2027-11-10", emoji: "🤲", title: "Dag van de Mantelzorg", jongeren: "Zorg jij thuis voor iemand? Jij verdient ook zorg.", ouders: "Kijk of je kind niet te veel thuistaken draagt.", leraren: "Vraag na of leerlingen thuis zorgen voor een ziek familielid." },
  { from: "2027-11-20", emoji: "🧒", title: "Dag van de Rechten van het Kind", jongeren: "Jij hebt recht op een veilig thuis en om gehoord te worden.", ouders: "Vraag je kind eens naar zijn of haar mening over een gezinsbesluit.", leraren: "Laat de klas zelf drie kinderrechten kiezen die zij het belangrijkst vinden." },
];

/** The special day(s) on a date (YYYY-MM-DD), single days before longer periods. */
export function themeDaysOn(day: string): ThemeDay[] {
  return THEME_DAYS.filter((t) => day >= t.from && day <= (t.to ?? t.from)).sort(
    (a, b) => Number(!!a.to) - Number(!!b.to),
  );
}

/** The text for one audience, or null when that audience has none on this day. */
export function themeTip(t: ThemeDay, audience: ThemeAudience): string | null {
  return t[audience] ?? null;
}
