/**
 * Interactive guides for parents ("handleidingen"): short steps with explanations, situations to
 * choose a reaction in (with feedback), sentences to pick for yourself, a checklist and a small plan.
 * Content is general guidance, not medical advice; it always points to real help.
 */
export type GuideOption = { text: string; verdict: "goed" | "kan beter" | "liever niet"; feedback: string };
export type GuideStep =
  | { kind: "uitleg"; title: string; text: string[]; tip?: string }
  | { kind: "keuze"; title: string; situation: string; question: string; options: GuideOption[] }
  | { kind: "zinnen"; title: string; text: string; sentences: string[]; avoid?: string[] }
  | { kind: "checklist"; title: string; text: string; items: string[]; after?: string }
  | { kind: "plan"; title: string; text: string; actions: string[] };

export type Guide = {
  slug: string;
  emoji: string;
  title: string;
  summary: string;
  minutes: number;
  steps: GuideStep[];
  /** The short reminder at the end (key sentences to keep). */
  cheatsheet: string[];
};

export const GUIDES: Guide[] = [
  {
    slug: "gesprek-beginnen",
    emoji: "💬",
    title: "Het gesprek beginnen als je je zorgen maakt",
    summary:
      "Je kind is stiller, sneller boos of trekt zich terug, en je weet niet hoe je erover begint. In 9 korte stappen oefen je wat je kunt zeggen, en wat je beter niet doet.",
    minutes: 12,
    steps: [
      {
        kind: "uitleg",
        title: "Waarom het zo lastig is",
        text: [
          "Veel jongeren laten thuis niet zien hoe het echt met ze gaat. Niet omdat ze jou niet vertrouwen, maar omdat ze je niet ongerust willen maken, zich schamen, of zelf nog niet weten wat er is.",
          "Eén groot gesprek lost het meestal niet op. Het gaat om veel kleine momenten waarin je kind merkt: bij mijn ouder kan ik terecht.",
        ],
        tip: "Je hoeft geen perfecte woorden te hebben. Laten merken dat je het ziet en dat je er bent, is al heel veel.",
      },
      {
        kind: "keuze",
        title: "Het goede moment",
        situation: "Je maakt je al een paar weken zorgen. Je wilt het vandaag bespreken.",
        question: "Wanneer begin je erover?",
        options: [
          {
            text: "Aan tafel, als het hele gezin erbij is",
            verdict: "liever niet",
            feedback: "Met iedereen erbij voelt het als een verhoor. De kans is groot dat je kind dichtklapt of het wegwuift.",
          },
          {
            text: "In de auto, tijdens een wandeling of samen koken",
            verdict: "goed",
            feedback: "Naast elkaar praat vaak makkelijker dan tegenover elkaar. Je hoeft elkaar niet aan te kijken, en je kind kan er makkelijk weer uit.",
          },
          {
            text: "Meteen als je kind thuiskomt uit school",
            verdict: "kan beter",
            feedback: "Na school is je kind vaak moe en heeft het tijd nodig om te landen. Wacht liever een rustiger moment af.",
          },
        ],
      },
      {
        kind: "zinnen",
        title: "Zo begin je",
        text: "Begin bij wat jij ziet, niet bij wat je denkt dat er aan de hand is. Kies een zin die bij jou past.",
        sentences: [
          "Ik merk dat je de laatste tijd stiller bent. Ik maak me een beetje zorgen, en ik wil gewoon weten hoe het met je gaat.",
          "Het lijkt alsof je ergens mee zit. Je hoeft niks uit te leggen, maar ik ben er als je wilt praten.",
          "Ik zie dat je veel op je kamer bent. Is er iets wat het zwaar maakt op dit moment?",
          "Ik vraag het niet om je te controleren. Ik vraag het omdat ik van je houd.",
        ],
        avoid: ["Wat is er met jou aan de hand?", "Doe niet zo moeilijk.", "Toen ik zo oud was, had ik het veel zwaarder."],
      },
      {
        kind: "keuze",
        title: "Als je kind dichtklapt",
        situation: "Je zegt dat je je zorgen maakt. Je kind zucht en zegt: ‘Laat me nou gewoon met rust.’",
        question: "Wat zeg je?",
        options: [
          {
            text: "‘Zo praat je niet tegen mij.’",
            verdict: "liever niet",
            feedback: "Begrijpelijk, maar dan gaat het gesprek over hoe je kind praat, en niet meer over hoe het met hem of haar gaat.",
          },
          {
            text: "‘Oké, ik laat je. Mijn deur staat altijd open, ook als het later is.’",
            verdict: "goed",
            feedback: "Je respecteert de grens en laat de deur open. Veel jongeren komen er later uit zichzelf op terug, vaak op een onverwacht moment.",
          },
          {
            text: "Blijven doorvragen tot je kind toch iets vertelt",
            verdict: "liever niet",
            feedback: "Aandringen zorgt vaak voor nog meer afstand. Laat merken dat je er bent, en probeer het een andere dag opnieuw.",
          },
        ],
      },
      {
        kind: "uitleg",
        title: "Luisteren: L S D",
        text: [
          "Luisteren: laat je kind uitpraten, ook als je het ergens niet mee eens bent. Leg je telefoon weg.",
          "Samenvatten: zeg in je eigen woorden wat je hoorde. ‘Dus je voelt je buitengesloten in je klas?’ Zo weet je kind dat je het echt hoort.",
          "Doorvragen: vraag naar gevoel, niet alleen naar feiten. ‘Wat doet dat met je?’ Vermijd ‘waarom’; dat voelt al snel als een verwijt.",
        ],
        tip: "Geef niet meteen oplossingen. Vraag liever: ‘Wil je dat ik meedenk, of wil je dat ik gewoon luister?’",
      },
      {
        kind: "keuze",
        title: "Als het zwaar wordt",
        situation: "Je kind vertelt zachtjes: ‘Soms voel ik me zo rot dat ik er niet meer wil zijn.’",
        question: "Wat doe je?",
        options: [
          {
            text: "‘Zeg dat toch niet! Je hebt alles om voor te leven.’",
            verdict: "liever niet",
            feedback: "Het komt uit schrik en liefde, maar je kind kan zich dan niet begrepen voelen en er verder over zwijgen.",
          },
          {
            text: "‘Wat goed dat je me dit vertelt. Hoe vaak denk je daaraan? We gaan hier samen hulp bij zoeken.’",
            verdict: "goed",
            feedback: "Rustig blijven, het serieus nemen en er direct naar vragen helpt. Erover praten brengt iemand niet op het idee. Zoek dezelfde dag nog hulp: de huisarts of 113 (0800-0113, ook voor ouders).",
          },
          {
            text: "‘Dat gaat wel over, iedereen heeft dat weleens.’",
            verdict: "liever niet",
            feedback: "Ook al bedoel je het geruststellend: zo voelt je kind zich niet serieus genomen. Gedachten aan er niet meer willen zijn verdienen altijd aandacht.",
          },
        ],
      },
      {
        kind: "checklist",
        title: "Wanneer zoek je hulp?",
        text: "Zie je een of meer van deze signalen langer dan twee weken? Zoek dan hulp, en praat er met je kind over.",
        items: [
          "Mijn kind slaapt of eet veel meer of minder dan normaal",
          "Mijn kind trekt zich terug van vrienden of dingen die het leuk vond",
          "Mijn kind is vaak somber, prikkelbaar of huilerig",
          "Mijn kind wil niet meer naar school of verzuimt veel",
          "Mijn kind praat over zichzelf als waardeloos of als een last",
          "Mijn kind doet zichzelf pijn of praat over er niet meer willen zijn",
        ],
        after:
          "Je kunt terecht bij de huisarts, het CJG of het wijkteam in je gemeente, en de mentor of zorgcoördinator op school. Bij gedachten aan zelfdoding: 113, gratis via 0800-0113. Je kind kan zelf anoniem praten met de Kindertelefoon (0800-0432). Bij direct gevaar: 112.",
      },
      {
        kind: "plan",
        title: "Wat ga jij deze week proberen?",
        text: "Kies één klein ding. Klein is goed: het gaat om herhalen, niet om een perfect gesprek.",
        actions: [
          "Een wandeling of autorit plannen, met tijd om te praten",
          "Eén van de beginzinnen gebruiken",
          "Vijf minuten luisteren zonder advies te geven",
          "Zeggen dat mijn deur altijd openstaat",
          "Mijn eigen zorgen bespreken met iemand die ik vertrouw",
        ],
      },
      {
        kind: "uitleg",
        title: "Zorg ook voor jezelf",
        text: [
          "Je zorgen maken om je kind is zwaar. Je hoeft het niet alleen te dragen: praat erover met je partner, een vriend, de huisarts of De Luisterlijn (088-0767000, dag en nacht).",
          "Een ouder die zelf wat rust heeft, kan beter luisteren. Goed voor jezelf zorgen is dus ook zorgen voor je kind.",
        ],
        tip: "Kijk morgen op je startscherm: daar staat elke dag een klein opdrachtje voor jezelf.",
      },
    ],
    cheatsheet: [
      "Kies een moment naast elkaar: in de auto, tijdens een wandeling.",
      "Begin bij wat je ziet: ‘Ik merk dat je stiller bent. Hoe gaat het echt?’",
      "Klapt je kind dicht? ‘Oké. Mijn deur staat altijd open.’",
      "Luisteren, Samenvatten, Doorvragen. Eerst luisteren, dan pas meedenken.",
      "Gaat het over er niet meer willen zijn? Rustig blijven, serieus nemen, dezelfde dag hulp zoeken (113: 0800-0113).",
    ],
  },
];

/** Guides that are coming, shown so parents know what to expect. */
export const GUIDES_SOON = [
  { emoji: "📱", title: "Schermtijd zonder ruzie" },
  { emoji: "😔", title: "Als je kind gepest wordt" },
  { emoji: "🏫", title: "Je kind wil niet naar school" },
  { emoji: "🌈", title: "Als je kind vertelt dat het lhbtiq+ is" },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug) ?? null;

/** Progress as a whole number from 0 to 100. */
export const guidePercent = (guide: Guide, step: number, done: boolean) =>
  done ? 100 : Math.round((Math.min(step, guide.steps.length) / guide.steps.length) * 100);
