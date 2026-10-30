/**
 * Texts of the public pages: privacy statement, house rules, terms, parents, help and organisations.
 * Written in simple Dutch for members from 12 years old. Parts in [brackets] are for the owner to fill in;
 * the legal texts are drafts that still need a check by someone who knows privacy law.
 */

/** Change this when the privacy statement or the terms change: every member is then asked to agree again. */
export const LEGAL_VERSION = "2026-10-30";

export type LegalSection = { title: string; text?: string[]; bullets?: string[] };
export type LegalPage = {
  title: string;
  emoji: string;
  intro: string;
  draft?: boolean;
  sections: LegalSection[];
  /** Shows a button to the contact form at the bottom, with this sender type selected. */
  contact?: "ouder" | "organisatie" | "jongere" | "anders";
};

export const ORG = {
  name: "CeritaProject",
  /** Fill in to show it; leave empty to leave it out. */
  kvk: "",
  email: "ceritaproject@outlook.com",
};
const kvk = ORG.kvk ? ` (KvK ${ORG.kvk})` : "";

export const HELP_LINES = [
  { name: "112", what: "Direct gevaar of een noodgeval", phone: "112", href: "tel:112" },
  {
    name: "113 Zelfmoordpreventie",
    what: "Denk je aan zelfmoord? Praat anoniem, dag en nacht",
    phone: "0800-0113",
    href: "https://www.113.nl",
  },
  {
    name: "De Kindertelefoon",
    what: "Voor alles waar je mee zit, tot 18 jaar",
    phone: "0800-0432",
    href: "https://www.kindertelefoon.nl",
  },
  {
    name: "Veilig Thuis",
    what: "Geweld of mishandeling thuis, of zorgen daarover",
    phone: "0800-2000",
    href: "https://veiligthuis.nl",
  },
  {
    name: "MIND Korrelatie",
    what: "Psychische vragen, anoniem",
    phone: "0900-1450",
    href: "https://www.mindkorrelatie.nl",
  },
] as const;

export const PRIVACY: LegalPage = {
  title: "Privacyverklaring",
  emoji: "🔒",
  draft: true,
  contact: "anders",
  intro:
    "Hier lees je welke gegevens CeritaProject over jou bewaart, waarom, wie ze kan zien en wat jouw rechten zijn. We verkopen je gegevens nooit en er staan geen advertenties in de app.",
  sections: [
    {
      title: "Wie zijn wij?",
      text: [
        `${ORG.name}${kvk} is verantwoordelijk voor je gegevens.`,
        `We hebben geen bezoekadres: we zijn er online. Vragen over je privacy? Mail naar ${ORG.email}, gebruik het contactformulier onderaan deze pagina, of stuur in de app een bericht aan de beheerders.`,
      ],
    },
    {
      title: "Welke gegevens bewaren we?",
      bullets: [
        "Je account: je e-mailadres en je wachtwoord (versleuteld, ook wij kunnen het niet lezen). Log je in met Google, dan krijgen we je naam en e-mailadres van Google.",
        "Je profiel: je naam, gebruikersnaam, profielfoto en wat je over jezelf schrijft.",
        "Je geboortedatum: daarmee kom je in de goede leeftijdsgroep (12–15, 16–25 of 26–27) en zie je alleen verhalen die bij je leeftijd passen. Andere leden zien je geboortedatum niet.",
        "Wat je deelt: berichten en reacties in groepen, privéberichten, foto's, bestanden en spraakberichten.",
        "Je dagboek: tekst, foto's en spraakberichten. Je dagboek is alleen voor jou.",
        "Je diertje, je to-do lijstjes en je dagopdrachten.",
        "Verhalen die je instuurt, met de naam en het e-mailadres die je zelf invult, en of we het mogen publiceren.",
        "Berichten die je aan de beheerders stuurt, en meldingen die je doet.",
        "Bij een bestelling: je naam en adres om het te kunnen versturen. Betalen gaat via Stripe: wij zien je bankgegevens niet.",
        "Welke verhalen je hebt gelezen, bewaard of een hartje hebt gegeven (anderen zien alleen het aantal, niet van wie).",
        "Als je pushmeldingen aanzet: een code van je telefoon, zodat we je een melding kunnen sturen.",
        "Technische gegevens, zoals wanneer je inlogt. Onze hosting bewaart kort je IP-adres om de app veilig te houden.",
      ],
    },
    {
      title: "Gevoelige gegevens",
      text: [
        "Wat je schrijft over hoe je je voelt, kan iets zeggen over je gezondheid. Dat zijn extra gevoelige gegevens. We gebruiken ze alleen om de app te laten werken en om je veilig te houden. Nooit voor reclame en nooit om je te beoordelen.",
      ],
    },
    {
      title: "Waarom gebruiken we je gegevens?",
      bullets: [
        "Om de app te laten werken: inloggen, je profiel, groepen, chatten, je dagboek en je diertje.",
        "Om iedereen veilig te houden: de huisregels bewaken, meldingen afhandelen en hulp bieden als het niet goed met iemand gaat.",
        "Met jouw toestemming: een ingestuurd verhaal publiceren, pushmeldingen sturen, of een spraakbericht in je dagboek omzetten naar tekst als jij daarop tikt.",
        "Omdat de wet het zegt: gegevens van bestellingen bewaren we 7 jaar voor de belastingdienst.",
      ],
    },
    {
      title: "Wie kan wat zien?",
      bullets: [
        "Leden zien je naam, gebruikersnaam, foto en wat je in een groep zet, maar alleen leden uit je eigen leeftijdsgroep.",
        "Privéberichten ziet alleen de ander in het gesprek.",
        "Je dagboek ziet niemand, ook de beheerders niet.",
        "Beheerders zien meldingen, berichten die je aan hen stuurt, ingestuurde verhalen en je naam en leeftijdsgroep. Zo kunnen ze helpen en de app veilig houden.",
        "Zorgsignalen: schrijf je in een groep, reactie of privébericht woorden over zelfmoord of jezelf pijn doen? Dan ziet een beheerder dat stukje tekst, zodat iemand je kan helpen. Verder lezen beheerders je privéberichten niet.",
        "Organisaties waarmee we samenwerken, krijgen alleen anonieme cijfers (bijvoorbeeld hoeveel jongeren de app gebruiken). Nooit namen of berichten. Groepjes kleiner dan 5 laten we niet zien.",
      ],
    },
    {
      title: "Welke diensten gebruiken we?",
      text: [
        "Voor de app werken we samen met deze bedrijven. Zij mogen je gegevens alleen gebruiken om de app te laten werken:",
      ],
      bullets: [
        "Supabase: de database en de opslag van foto's en bestanden.",
        "Vercel: de website en de server van de app.",
        "Stripe: betalingen in de shop.",
        "Google Firebase: pushmeldingen op je telefoon.",
        "Resend: e-mails om je account te bevestigen of je wachtwoord te herstellen.",
        "OpenAI (Verenigde Staten): spraak omzetten naar tekst in je dagboek, alleen als jij daarop tikt, en beheerders helpen om een melding snel te begrijpen. OpenAI gebruikt deze gegevens niet om zijn eigen AI te trainen.",
        "Spotify, YouTube en Apple Music: de muziekspelers bij Ontdekken → Muziek. Die laden pas als jij op Luisteren tikt; die dienst kan dan cookies plaatsen. YouTube gebruiken we in de privacyvriendelijke stand.",
      ],
    },
    {
      title: "Hoe lang bewaren we je gegevens?",
      bullets: [
        "Zolang je een account hebt.",
        "Verwijder je je account (Profiel → Account verwijderen), dan wissen we je account en wat je hebt gedeeld meteen. Alleen bestelgegevens bewaren we 7 jaar, omdat de wet dat zegt.",
        "Back-ups worden na 7 dagen automatisch gewist.",
      ],
    },
    {
      title: "Ben je jonger dan 16?",
      text: [
        "Dan moet je ouder of verzorger het goed vinden dat je CeritaProject gebruikt. Daarom vragen we je dat bij het aanmelden. Op de pagina 'Voor ouders' lezen je ouders wat CeritaProject is.",
      ],
    },
    {
      title: "Jouw rechten",
      bullets: [
        "Je mag vragen welke gegevens we van je hebben.",
        "Je mag gegevens laten verbeteren of laten wissen. Je account verwijderen kan zelf in de app.",
        "Je mag bezwaar maken tegen hoe we je gegevens gebruiken.",
        `Stuur je vraag naar ${ORG.email}. We antwoorden binnen een maand.`,
        "Ben je het niet met ons eens? Dan mag je een klacht indienen bij de Autoriteit Persoonsgegevens (autoriteitpersoonsgegevens.nl).",
      ],
    },
    {
      title: "Beveiliging",
      text: [
        "Je gegevens worden versleuteld verstuurd. De database is zo ingesteld dat iedereen alleen ziet wat hij of zij mag zien. Foto's en bestanden staan in een afgeschermde opslag.",
      ],
    },
    {
      title: "Veranderingen",
      text: [
        "Passen we deze privacyverklaring aan, dan zie je dat in de app en vragen we je opnieuw om akkoord te gaan.",
      ],
    },
  ],
};

export const HOUSE_RULES: LegalPage = {
  title: "Huisregels",
  emoji: "💛",
  intro: "CeritaProject is een veilige plek voor iedereen. Daarom hebben we samen deze afspraken.",
  sections: [
    {
      title: "Zo gaan we met elkaar om",
      bullets: [
        "Wees lief en respectvol, ook als je het ergens niet mee eens bent.",
        "Iedereen hoort erbij: geen pesten, schelden, discriminatie of buitensluiten.",
        "Luister naar elkaar en oordeel niet. Iedereen heeft zijn eigen verhaal.",
        "Geef geen medisch advies. Zeg liever: 'praat erover met iemand die je vertrouwt'.",
      ],
    },
    {
      title: "Jouw veiligheid",
      bullets: [
        "Deel geen adres, school, telefoonnummer, wachtwoorden of andere dingen waarmee iemand je kan vinden.",
        "Spreek niet af met iemand die je alleen van internet kent.",
        "Iemand vraagt om foto's, geld of geheimen? Stop het gesprek en meld het.",
        "Zie je iets wat niet goed voelt? Tik op 'melden'. Je melding is anoniem.",
      ],
    },
    {
      title: "Wat mag niet",
      bullets: [
        "Seksuele berichten of foto's.",
        "Geweld, bedreigingen of haat.",
        "Uitleg over hoe je jezelf pijn doet, of iemand anders daartoe aanmoedigen.",
        "Drugs of alcohol aanprijzen.",
        "Reclame, spam of nepaccounts.",
        "Berichten of foto's van anderen delen zonder dat ze het goed vinden.",
      ],
    },
    {
      title: "Gaat het niet goed met je?",
      text: [
        "Je mag delen hoe je je voelt, ook als het zwaar is. Schrijf je over zelfmoord of jezelf pijn doen? Dan ziet een beheerder dat, zodat iemand je kan helpen. Heb je nu meteen hulp nodig? Kijk bij 'Hulp nodig?' in de app.",
      ],
    },
    {
      title: "Wat doen de beheerders?",
      bullets: [
        "Ze lezen meldingen en helpen als iets niet goed gaat.",
        "Ze kunnen berichten verbergen, iemand waarschuwen, een time-out geven of iemand uit de app halen.",
        "Je herkent een beheerder aan het schildje 🛡️ bij de profielfoto.",
      ],
    },
  ],
};

export const TERMS: LegalPage = {
  title: "Gebruiksvoorwaarden",
  emoji: "📄",
  draft: true,
  contact: "anders",
  intro: "Dit zijn de afspraken als je CeritaProject gebruikt.",
  sections: [
    {
      title: "Wie mag meedoen?",
      bullets: [
        "Jongeren van 12 tot en met 27 jaar.",
        "Ben je jonger dan 16? Dan moet je ouder of verzorger het goed vinden.",
        "Je vult je echte geboortedatum in en hebt maar één account.",
      ],
    },
    {
      title: "Wat je deelt",
      bullets: [
        "Wat je schrijft of deelt, blijft van jou.",
        "Je geeft ons toestemming om het in de app te laten zien aan de mensen voor wie het bedoeld is.",
        "Een verhaal dat je instuurt, publiceren we alleen als jij daar toestemming voor geeft. We kunnen het wat inkorten of herkenbare dingen eruit halen.",
        "Je houdt je aan de huisregels. Doe je dat niet, dan mogen we berichten verbergen of je account (tijdelijk) blokkeren.",
      ],
    },
    {
      title: "Geen vervanging voor hulp",
      text: [
        "CeritaProject is een plek om te delen en steun te vinden. Het is geen hulpverlening en geen vervanging voor een arts, psycholoog of andere professional. Heb je hulp nodig? Kijk bij 'Hulp nodig?'.",
      ],
    },
    {
      title: "De shop",
      bullets: [
        "Prijzen staan in de shop, inclusief btw.",
        "Betalen gaat veilig via Stripe.",
        "Fysieke producten mag je binnen 14 dagen na ontvangst terugsturen, zonder reden. Dat vraag je aan in de app: Shop → Mijn bestellingen → Retourneren. We mailen je dan het retouradres.",
        "Stuur het product ongebruikt en in de originele verpakking terug. De verzendkosten voor het terugsturen betaal je zelf.",
        "Je krijgt het hele bedrag terug, binnen 14 dagen nadat we het pakketje hebben ontvangen. De punten voor je diertje die je met die bestelling kreeg, gaan er dan weer af.",
        `Klopt er iets niet met je bestelling? Mail naar ${ORG.email}.`,
      ],
    },
    {
      title: "Je account stoppen",
      text: [
        "Je kunt altijd stoppen: Profiel → Account verwijderen. Wij kunnen je account stoppen als je je niet aan de huisregels of deze voorwaarden houdt.",
      ],
    },
    {
      title: "Overig",
      bullets: [
        "We doen ons best om de app goed te laten werken, maar kunnen niet beloven dat hij altijd werkt.",
        "We kunnen deze voorwaarden aanpassen. Dan vragen we je opnieuw om akkoord te gaan.",
        "Op deze voorwaarden is Nederlands recht van toepassing.",
      ],
    },
  ],
};

export const PARENTS: LegalPage = {
  title: "Voor ouders en verzorgers",
  emoji: "👨‍👩‍👧",
  contact: "ouder",
  intro:
    "Uw kind wil CeritaProject gebruiken. Hier leest u wat de app is, hoe we jongeren veilig houden en wat er met hun gegevens gebeurt.",
  sections: [
    {
      title: "Wat is CeritaProject?",
      text: [
        "CeritaProject is een app voor jongeren van 12 tot 27 jaar. Jongeren lezen echte verhalen van leeftijdsgenoten, delen wat ze meemaken en steunen elkaar. Er is een privé dagboek, een virtueel huisdiertje met dagelijkse taakjes en er zijn podcasts en artikelen over mentale gezondheid.",
      ],
    },
    {
      title: "Hoe houden we jongeren veilig?",
      bullets: [
        "Leeftijdsgroepen: jongeren van 12–15 zien alleen leeftijdsgenoten. Ze komen niet in contact met volwassen leden.",
        "Verhalen over heel zware onderwerpen zijn pas te zien vanaf 16 jaar.",
        "Privéchatten kan alleen na een verzoek dat de ander accepteert, en je kunt iemand blokkeren.",
        "Beheerders lezen meldingen en kunnen berichten verbergen, waarschuwen of iemand uit de app halen.",
        "Zorgsignalen: schrijft een jongere over zelfmoord of zichzelf pijn doen, dan krijgt hij of zij meteen hulpnummers te zien en ziet een beheerder het bericht.",
        "Geen advertenties, en we verkopen geen gegevens.",
      ],
    },
    {
      title: "Privacy",
      text: [
        "We bewaren alleen wat nodig is om de app te laten werken. Het dagboek is privé, ook voor de beheerders. In de privacyverklaring leest u precies welke gegevens we bewaren en welke rechten u en uw kind hebben.",
      ],
    },
    {
      title: "Toestemming",
      text: [
        "Is uw kind jonger dan 16? Dan vragen we bij het aanmelden of u ervan weet en het goed vindt. Heeft u vragen, wilt u dat we het account verwijderen of wilt u meer weten? Stuur ons dan een bericht met het formulier onderaan deze pagina.",
        `Mailen kan ook: ${ORG.email}`,
      ],
    },
    {
      title: "Wat kunt u zelf doen?",
      bullets: [
        "Praat met uw kind over wat het in de app leest en deelt.",
        "Spreek af dat uw kind nooit adres, school of telefoonnummer deelt en niet afspreekt met onbekenden.",
        "Maakt u zich zorgen over uw kind? Bel de Kindertelefoon voor tips (0800-0432) of uw huisarts.",
      ],
    },
  ],
};

export const ORGANISATIONS: LegalPage = {
  title: "Voor organisaties",
  emoji: "🤝",
  contact: "organisatie",
  intro:
    "Werkt u met jongeren, bijvoorbeeld als school, gemeente, jongerenwerk of hulpverlening? CeritaProject werkt graag met u samen.",
  sections: [
    {
      title: "Wat is CeritaProject?",
      text: [
        "Een veilige app waarin jongeren van 12 tot 27 jaar hun verhaal delen, verhalen van leeftijdsgenoten lezen en elkaar steunen. Met een privé dagboek, dagelijkse kleine opdrachten, een virtueel huisdiertje dat helpt met structuur, breinspelletjes, artikelen, podcasts en interviews.",
      ],
    },
    {
      title: "Veiligheid voorop",
      bullets: [
        "Aparte leeftijdsgroepen (12–15, 16–25, 26–27): jonge leden komen niet in contact met volwassenen.",
        "Zware verhalen alleen vanaf 16 jaar.",
        "Moderatie door beheerders, met meldknop, waarschuwingen en time-outs.",
        "Zorgsignalen: woorden over zelfmoord of zelfbeschadiging worden direct zichtbaar voor een beheerder, en de jongere krijgt hulpnummers te zien.",
        "Doorverwijzing naar 113, de Kindertelefoon en Veilig Thuis.",
      ],
    },
    {
      title: "Privacy",
      bullets: [
        "Gegevens worden alleen gebruikt om de app te laten werken. Geen advertenties, geen verkoop van gegevens.",
        "Partners krijgen alleen anonieme cijfers, en groepjes kleiner dan 5 laten we niet zien.",
        "Het dagboek is privé, ook voor beheerders.",
      ],
    },
    {
      title: "Samenwerken",
      bullets: [
        "Jongeren naar CeritaProject verwijzen.",
        "Samen content maken: podcasts, interviews of artikelen met uw professionals.",
        "Anonieme impactcijfers: hoeveel jongeren de app gebruiken en welke onderwerpen veel gelezen worden.",
      ],
    },
    {
      title: "Contact",
      text: [
        `${ORG.name}${kvk}. Mail ons op ${ORG.email}, of stuur een bericht via het formulier hieronder.`,
      ],
    },
  ],
};
