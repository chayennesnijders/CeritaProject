/**
 * Home, for the owner only: a short daily story about what CeritaProject has already reached
 * (live numbers) and what it can still grow into, plus one small step for today.
 */
export type FounderStats = {
  members: number;
  waitlist: number;
  stories: number;
  groups: number;
  coaches: number;
};

export type FounderStory = { title: string; now: string; dream: string; step: string };

const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

const STORIES: ((s: FounderStats) => FounderStory)[] = [
  (s) => ({
    title: "Het begon met één idee",
    now: `Ooit was CeritaProject alleen een gedachte in jouw hoofd. Nu is het een echte app, met ${n(s.members, "lid", "leden")} en ${n(s.stories, "verhaal", "verhalen")} van echte jongeren.`,
    dream:
      "Stel je voor: over een jaar opent een jongere ergens in Nederland de app op een zware avond, en voelt zich voor het eerst niet alleen. Dat gebeurt dan elke dag.",
    step: "Lees vandaag één verhaal in de app terug, en onthoud waarom je hiermee begon.",
  }),
  (s) => ({
    title: "Ze wachten op jou",
    now: `${n(s.waitlist, "jongere staat", "jongeren staan")} op de wachtlijst. Niemand heeft ze gedwongen. Ze kwamen zelf, omdat jouw woorden hen raakten.`,
    dream:
      "Als de app in de Play Store en de App Store staat, krijgen zij als eersten een mailtje van jou. Dat wordt het begin van een groeiende community.",
    step: "Post vandaag je TikToks, met de wachtlijst-link in je bio. Elke post is een deur die openstaat.",
  }),
  (s) => ({
    title: "Verhalen die blijven",
    now: `Er staan ${n(s.stories, "verhaal", "verhalen")} in de app. Elk verhaal is van iemand die durfde te delen, omdat jij een veilige plek bouwde.`,
    dream:
      "Ooit is CeritaProject de plek in Nederland waar jongeren zich herkennen in elkaars verhalen. Een bibliotheek van moed.",
    step: "Plan vandaag één nieuw verhaal in, en kies er een mooie foto bij.",
  }),
  (s) => ({
    title: "Jij bouwde een veilige plek",
    now: `Er zijn ${n(s.groups, "groep", "groepen")}, met leeftijdsgroepen, moderatie, zorgsignalen en hulpnummers. Je hebt nagedacht over veiligheid op een manier waar grote bedrijven van kunnen leren.`,
    dream:
      "Gemeenten en scholen kiezen straks voor CeritaProject, juist omdat het zo veilig is opgezet.",
    step: "Schrijf vandaag drie dingen op waar je trots op bent. Je hebt er meer dan je denkt.",
  }),
  (s) => ({
    title: "Je staat er niet alleen voor",
    now: `${s.coaches > 0 ? `Er ${s.coaches === 1 ? "is" : "zijn"} al ${n(s.coaches, "coach", "coaches")} die met je meebouwen.` : "Je bent begonnen met jezelf, en dat was genoeg om te starten."} Testers, leden en vrienden denken mee.`,
    dream:
      "Er komt een team rond CeritaProject: coaches, moderatoren, een jongerenpanel. Mensen die net zo in deze droom geloven als jij.",
    step: "Stuur vandaag iemand die je helpt een berichtje om te bedanken.",
  }),
  (s) => ({
    title: "Van niks naar iets",
    now: `Een jaar geleden bestond dit allemaal niet. Nu is er een app met ${n(s.members, "lid", "leden")}, een wachtlijst van ${s.waitlist}, een eigen domein en een KvK-nummer.`,
    dream:
      "Over een jaar kijk je terug op vandaag, en zie je hoe klein het nog was. En hoe groot het is geworden.",
    step: "Maak vandaag een screenshot van je beginscherm. Later ben je blij dat je hem hebt.",
  }),
  (s) => ({
    title: "Jouw verhaal is de basis",
    now: "CeritaProject bestaat omdat jij weet hoe het voelt om iets mee te dragen. Dat maakt jou geloofwaardig op een manier die je niet kunt kopen.",
    dream: `Straks sta je op een podium, voor een zaal met jongeren of beleidsmakers, en vertel je hoe het begon. Met achter je een community van honderden, daarna duizenden jongeren. Nu al ${s.members + s.waitlist}.`,
    step: "Neem vandaag even rust. Ook bouwers mogen opladen.",
  }),
  (s) => ({
    title: "Elke aanmelding is een mens",
    now: `Achter elk van de ${s.waitlist} namen op de wachtlijst zit een jongere met een eigen verhaal. Ze kozen ervoor om op jou te wachten.`,
    dream:
      "De wachtlijst wordt een community, en de community wordt een beweging: door jongeren, voor jongeren.",
    step: "Reageer vandaag op een paar reacties onder je TikToks. Persoonlijk contact maakt het verschil.",
  }),
  (s) => ({
    title: "Klaar voor de winkel",
    now: "De app heeft een naam, een logo, een privacyverklaring, een veiligheidsplan en een pagina om je account te verwijderen. Alles wat de Play Store vraagt, staat klaar.",
    dream: `Binnenkort staat CeritaProject tussen de apps van grote merken. Jouw app, op duizenden telefoons. Je begint met ${s.waitlist} jongeren die er al op wachten.`,
    step: "Check vandaag wat er nog op je lijstje staat voor de Play Store, en doe één ding.",
  }),
  (s) => ({
    title: "Meer dan een app",
    now: `CeritaProject heeft verhalen, groepen, coaches, een diertje, rustmomenten en een veiligheidsplan. ${n(s.stories, "verhaal", "verhalen")} en ${n(s.groups, "groep", "groepen")} wachten op jongeren.`,
    dream:
      "Ooit hoort CeritaProject bij het rijtje van 113 en de Kindertelefoon: een plek die iedere mentor en ouder kent.",
    step: "Vertel vandaag aan één persoon wat je aan het bouwen bent. Hardop zeggen maakt het echt.",
  }),
  (s) => ({
    title: "Kleine stappen tellen",
    now: `Elke dag een klein beetje: een post, een verhaal, een verbetering. Samen werd dat ${n(s.members, "lid", "leden")}, ${s.waitlist} op de wachtlijst en ${n(s.stories, "verhaal", "verhalen")}.`,
    dream:
      "Doe je dit een jaar lang vol, dan bouw je iets wat blijft. Niet in één sprong, maar met duizend kleine stapjes.",
    step: "Kies vandaag één kleine taak, en vink hem af. Dat is genoeg.",
  }),
  (s) => ({
    title: "Je droom heeft een vorm",
    now: "Je weet waar je naartoe wilt: een app die jongeren helpt, gefinancierd door organisaties, zodat het voor jongeren altijd gratis blijft.",
    dream: `Stel je voor: gemeenten, scholen en fondsen die zeggen "dit willen we voor onze jongeren". Dan groeit de app van ${s.members + s.waitlist} naar tienduizenden jongeren.`,
    step: "Schrijf vandaag op welke gemeente of school je als eerste zou willen benaderen.",
  }),
  (s) => ({
    title: "Je hebt al zoveel opgelost",
    now: "Mails, pushmeldingen, een nieuw domein, honderden verhalen. Je bent tegen problemen aangelopen, en je bent elke keer doorgegaan.",
    dream: `Die doorzetter in jou is precies wat CeritaProject groot gaat maken. ${s.waitlist} jongeren rekenen erop.`,
    step: "Geef jezelf vandaag een compliment. Echt. Je verdient het.",
  }),
  (s) => ({
    title: "Kijk hoe ver je bent",
    now: `Vandaag: ${n(s.members, "lid", "leden")}, ${s.waitlist} op de wachtlijst, ${n(s.stories, "verhaal", "verhalen")}, ${n(s.groups, "groep", "groepen")}${s.coaches ? ` en ${n(s.coaches, "coach", "coaches")}` : ""}. Dat heb jij gemaakt.`,
    dream:
      "Morgen staat er weer een cijfer hoger. En overmorgen weer. Zo groeit een droom: dag na dag.",
    step: "Sta vandaag één minuut stil bij deze cijfers. Je mag trots zijn.",
  }),
];

/** Days since 1 January 1970 for a YYYY-MM-DD key, so the story changes at midnight. */
const dayNumber = (day: string) => Math.floor(Date.parse(`${day}T00:00:00Z`) / 86400000) || 0;

export function founderStory(stats: FounderStats, day: string): FounderStory {
  const pick = STORIES[((dayNumber(day) % STORIES.length) + STORIES.length) % STORIES.length]!;
  return pick(stats);
}

export const FOUNDER_STORY_COUNT = STORIES.length;
