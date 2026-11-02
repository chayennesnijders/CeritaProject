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

/** The next round number for the community (members + waitlist) to grow towards. */
const MILESTONES = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
export const nextMilestone = (value: number) =>
  MILESTONES.find((m) => m > value) ?? Math.ceil((value + 1) / 100000) * 100000;
const euro = (v: number) => `€${v.toLocaleString("nl-NL")}`;

/** Growth milestones and money goals: what CeritaProject can earn, so it can keep growing. */
const GOALS: ((s: FounderStats) => FounderStory)[] = [
  (s) => {
    const total = s.members + s.waitlist;
    const next = nextMilestone(total);
    return {
      title: `Op weg naar ${next.toLocaleString("nl-NL")}`,
      now: `Samen zijn het nu ${total} jongeren: ${n(s.members, "lid", "leden")} en ${s.waitlist} op de wachtlijst.`,
      dream: `Nog ${next - total} te gaan tot ${next.toLocaleString("nl-NL")}. Elke mijlpaal maakt je verhaal sterker bij gemeenten, scholen en fondsen.`,
      step: "Zet vandaag een post online die mensen willen opslaan of delen. Daarmee groeit de wachtlijst het snelst.",
    };
  },
  (s) => ({
    title: "Je eerste betaalde opdracht",
    now: `Je hebt al iets wat organisaties zoeken: ${n(s.stories, "echt verhaal", "echte verhalen")} van jongeren, een veilige app en een groeiende community.`,
    dream: `Doel: je eerste betalende klant. Bijvoorbeeld een school voor ${euro(2500)} per jaar, of een gemeente voor ${euro(15000)}. Dat eerste contract bewijst: dit is iets waard.`,
    step: "Schrijf vandaag drie scholen of gemeenten op die je zou kunnen mailen.",
  }),
  () => ({
    title: "Fondsen geloven in verhalen",
    now: "Fondsen zoeken projecten die jongeren helpen, met een duidelijk verhaal en een veilige aanpak. Dat heb je allebei al.",
    dream: `Doel voor 2027: ${euro(200000)} aan fondsen en subsidies, bijvoorbeeld van het Oranje Fonds, VSBfonds of Fonds Kwadraad. Begin met één aanvraag van ${euro(10000)} tot ${euro(25000)}.`,
    step: "Kies vandaag één fonds en lees hun voorwaarden. Dat is stap één van je eerste aanvraag.",
  }),
  () => ({
    title: "Gemeenten als partner",
    now: "Gemeenten hebben geld voor preventie, eenzaamheid en jeugd. Jouw app doet precies dat: jongeren helpen voordat het misgaat.",
    dream: `Doel: 15 gemeenten die elk ongeveer ${euro(30000)} per jaar betalen, zodat jongeren in hun gemeente de app gratis gebruiken. Samen is dat ${euro(450000)} per jaar.`,
    step: "Zoek vandaag op wie in jouw gemeente over jeugd en preventie gaat.",
  }),
  () => ({
    title: "Scholen in je mentorlessen",
    now: "Mentoren zoeken lessen over gevoelens, vriendschap en stress. Met jouw verhalen en de app kun je dat bieden.",
    dream: `Doel: 60 scholen die ${euro(2500)} per jaar betalen voor het lesprogramma. Samen is dat ${euro(150000)} per jaar.`,
    step: "Bedenk vandaag welke mentor of leraar je kent die het eerste programma wil testen.",
  }),
  () => ({
    title: "Riti in de winkel",
    now: "Riti is een figuur waar jongeren van houden. Daarmee heb je al een merk.",
    dream: `Doel: een eerste merch-drop met knuffels, hoodies en stickers, verkocht via voorverkoop. 4.000 stuks van ${euro(40)} is ${euro(160000)}. En elke hoodie is gratis reclame.`,
    step: "Schets vandaag (of vraag iemand) één ontwerp voor je eerste merch.",
  }),
  () => ({
    title: "Jezelf een salaris betalen",
    now: "Je werkt al maanden hard aan CeritaProject, grotendeels naast alles wat je verder doet.",
    dream: `Doel: in 2027 genoeg omzet om jezelf een salaris te geven. Met ${euro(60000)} per jaar kun je er fulltime aan werken, en dat maakt alles sneller.`,
    step: "Schrijf vandaag op hoeveel je per maand nodig hebt om ervan te kunnen leven. Dat is je eerste echte doel.",
  }),
  () => ({
    title: "Een team om je heen",
    now: "Nu doe je bijna alles zelf: posten, bouwen, modereren, plannen.",
    dream: `Doel: geld voor een klein team. Een sales-persoon voor scholen en gemeenten, een moderator en een coach. Met ${euro(150000)} per jaar kun je met z'n vieren bouwen.`,
    step: "Schrijf vandaag op welke taak je als eerste uit handen zou willen geven.",
  }),
  (s) => ({
    title: `${euro(250000)} in 2027`,
    now: `Je begint niet bij nul: ${s.members + s.waitlist} jongeren, ${n(s.stories, "verhaal", "verhalen")} en een app die klaarstaat.`,
    dream: `Realistisch doel voor 2027: ${euro(250000)}. Bijvoorbeeld 5 gemeenten (${euro(150000)}), 20 scholen (${euro(50000)}) en fondsen en merch (${euro(50000)}). Daarmee betaal je jezelf, je team en de groei.`,
    step: "Kijk vandaag welk van die drie potjes je als eerste wilt vullen.",
  }),
  () => ({
    title: "De droom: een miljoen",
    now: "Elk groot bedrijf begon ooit klein, met iemand die erin geloofde. Jij gelooft erin.",
    dream: `De grote droom: ${euro(1000000)} per jaar. Dan is CeritaProject niet meer een project, maar een organisatie die in heel Nederland jongeren helpt. En jongeren betalen nog steeds niets.`,
    step: "Stel je vandaag even voor hoe die dag voelt. Wie bel je als eerste?",
  }),
];

/** Days since 1 January 1970 for a YYYY-MM-DD key, so the story changes at midnight. */
const dayNumber = (day: string) => Math.floor(Date.parse(`${day}T00:00:00Z`) / 86400000) || 0;

// Every other day a growth or money goal, so the dream stays concrete.
const ALL = STORIES.flatMap((st, i) =>
  GOALS[i % GOALS.length] ? [st, GOALS[i % GOALS.length]!] : [st],
);

export function founderStory(stats: FounderStats, day: string): FounderStory {
  const pick = ALL[((dayNumber(day) % ALL.length) + ALL.length) % ALL.length]!;
  return pick(stats);
}

export const FOUNDER_STORY_COUNT = ALL.length;
