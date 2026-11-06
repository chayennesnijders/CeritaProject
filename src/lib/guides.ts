/**
 * Interactive guides for parents ("handleidingen"): short steps with explanations, situations to
 * choose a reaction in (with feedback), sentences to pick for yourself, a checklist and a small plan.
 * Content is general guidance, not medical advice; it always points to real help.
 */
import { EXTRA_GUIDES } from "./guides-extra";

export type GuideOption = { text: string; verdict: "goed" | "kan beter" | "liever niet"; feedback: string };
export type GuideStep =
  | { kind: "uitleg"; title: string; text: string[]; tip?: string }
  | { kind: "keuze"; title: string; situation: string; question: string; options: GuideOption[] }
  | { kind: "zinnen"; title: string; text: string; sentences: string[]; avoid?: string[] }
  | { kind: "checklist"; title: string; text: string; items: string[]; after?: string }
  | { kind: "plan"; title: string; text: string; actions: string[] }
  | { kind: "gesprek"; title: string; text: string; lines: GuideLine[] };

/** One line of an example conversation; "why" explains what makes it work. */
export type GuideLine = { who: "ouder" | "kind"; text: string; why?: string };

/** How a parent says their plan went, a few days later. */
export type Reflection = "goed" | "lastig" | "niet";

export type Guide = {
  slug: string;
  emoji: string;
  title: string;
  summary: string;
  minutes: number;
  /** For whom, e.g. "Ouders van kinderen van 10 tot 18". */
  forWho: string;
  /** What you can do after this guide (shown before you start). */
  outcomes: string[];
  steps: GuideStep[];
  /** The short reminder at the end (key sentences to keep). */
  cheatsheet: string[];
  /** Advice after the check-in "how did your plan go?". */
  followUp: Record<Reflection, string>;
};

export const GUIDES: Guide[] = [
  {
    slug: "gesprek-beginnen",
    emoji: "💬",
    title: "Het gesprek beginnen als je je zorgen maakt",
    summary:
      "Je kind is stiller, sneller boos of trekt zich terug, en je weet niet hoe je erover begint. In 10 korte stappen oefen je wat je kunt zeggen, en wat je beter niet doet.",
    minutes: 15,
    forWho: "Ouders en verzorgers van kinderen van 10 tot 18 jaar",
    outcomes: [
      "Je weet wanneer en waar je het gesprek het best begint",
      "Je hebt een eerste zin klaarliggen die bij jou past",
      "Je weet wat je zegt als je kind dichtklapt, of iets heftigs vertelt",
      "Je herkent wanneer het tijd is voor hulp, en waar je dan terechtkunt",
    ],
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
        kind: "gesprek",
        title: "Zo kan het klinken",
        text: "Een voorbeeld van een gesprek in de auto. Tik op een zin van de ouder om te zien waarom die werkt.",
        lines: [
          { who: "ouder", text: "Ik merk dat je de laatste tijd minder met je vrienden afspreekt.", why: "Je beschrijft wat je ziet, zonder oordeel. Daar kan je kind niet tegenin gaan." },
          { who: "kind", text: "Ja, en? Mag dat niet?" },
          { who: "ouder", text: "Tuurlijk mag dat. Ik vroeg me alleen af hoe het met je gaat.", why: "Je gaat niet in de verdediging, en maakt meteen duidelijk dat het je om je kind gaat." },
          { who: "kind", text: "Gewoon. Ze doen een beetje raar de laatste tijd." },
          { who: "ouder", text: "Raar? Hoe bedoel je?", why: "Doorvragen met de woorden van je kind zelf. Kort, nieuwsgierig, geen ‘waarom’." },
          { who: "kind", text: "Ze hebben een groepsapp zonder mij. Ik zag het bij iemand op zijn telefoon." },
          { who: "ouder", text: "Dus je voelt je buitengesloten door je eigen vrienden. Dat doet pijn.", why: "Samenvatten en het gevoel benoemen. Je kind voelt zich gehoord, en vertelt vaak uit zichzelf meer." },
          { who: "kind", text: "Ja… best wel." },
          { who: "ouder", text: "Wil je dat ik meedenk, of wil je vooral dat ik het weet?", why: "Je kind houdt de regie. Dat maakt het makkelijker om de volgende keer weer naar jou te komen." },
        ],
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
    followUp: {
      goed: "Mooi dat het gesprek op gang kwam. Houd het klein en herhaal het: een korte check-in in de auto of tijdens het koken werkt vaak beter dan een groot gesprek. Vraag over een paar dagen gewoon nog eens hoe het gaat, ook als het goed lijkt.",
      lastig: "Dat het lastig was, is heel normaal. Een eerste poging die stroef gaat is niet mislukt: je kind weet nu dat je het ziet. Probeer het over een paar dagen opnieuw op een ander moment, en zeg gerust: ‘Ik deed het misschien wat onhandig laatst, maar ik meen het.’",
      niet: "Het kwam er nog niet van, en dat is oké. Kies één moment deze week waarop jullie toch al samen zijn, zoals een autorit, en neem je voor alleen de eerste zin te zeggen. Meer hoeft niet.",
    },
  },
  ...EXTRA_GUIDES,
];

/** Guides that are coming, shown so parents know what to expect. */
export const GUIDES_SOON = [
  { emoji: "🩹", title: "Als je kind zichzelf pijn doet" },
  { emoji: "🏠", title: "Scheiden zonder dat je kind ertussen zit" },
  { emoji: "🍽️", title: "Zorgen over eten en lichaamsbeeld" },
  { emoji: "📚", title: "Stress rond toetsen en examens" },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug) ?? null;

/** Progress as a whole number from 0 to 100. */
export const guidePercent = (guide: Guide, step: number, done: boolean) =>
  done ? 100 : Math.round((Math.min(step, guide.steps.length) / guide.steps.length) * 100);

/** The text of a step, to read aloud (e.g. while driving). */
export function stepSpeech(step: GuideStep): string {
  switch (step.kind) {
    case "uitleg":
      return [step.title, ...step.text, step.tip ?? ""].filter(Boolean).join(" ");
    case "keuze":
      return [step.title, step.situation, step.question, ...step.options.map((o, i) => `Antwoord ${i + 1}: ${o.text}`)].join(" ");
    case "zinnen":
      return [step.title, step.text, ...step.sentences].join(" ");
    case "checklist":
      return [step.title, step.text, ...step.items, step.after ?? ""].filter(Boolean).join(" ");
    case "plan":
      return [step.title, step.text, ...step.actions].join(" ");
    case "gesprek":
      return [step.title, ...step.lines.map((l) => `${l.who === "ouder" ? "Ouder" : "Kind"}: ${l.text}`)].join(" ");
  }
}

/** The cheat sheet as plain text, to share with a partner or save in notes. */
export function cheatsheetText(guide: Guide, plan: string): string {
  const lines = [`${guide.emoji} ${guide.title}`, "", ...guide.cheatsheet.map((c, i) => `${i + 1}. ${c}`)];
  if (plan.trim()) lines.push("", `Mijn plan: ${plan.trim()}`);
  lines.push("", "Uit de handleidingen van CeritaProject");
  return lines.join("\n");
}

export const REFLECTIONS: { id: Reflection; emoji: string; label: string }[] = [
  { id: "goed", emoji: "😊", label: "Het ging goed" },
  { id: "lastig", emoji: "😕", label: "Het was lastig" },
  { id: "niet", emoji: "⏳", label: "Het kwam er nog niet van" },
];

/** Two days after finishing a guide with a plan, ask how the plan went (once). */
export const CHECK_IN_AFTER_MS = 2 * 86_400_000;
export function needsCheckIn(
  row: { completed_at: string | null; plan: string; reflection: string | null },
  now: number,
): boolean {
  if (!row.completed_at || row.reflection || !row.plan.trim()) return false;
  return now - Date.parse(row.completed_at) >= CHECK_IN_AFTER_MS;
}

/** The guide to show on the parent home: one you're in the middle of, otherwise the first new one. */
export function nextGuideFor(rows: { guide: string; step: number; completed_at: string | null }[]) {
  for (const g of GUIDES) {
    const r = rows.find((x) => x.guide === g.slug);
    if (r && !r.completed_at && r.step > 0) return { guide: g, status: "verder" as const, pct: guidePercent(g, r.step, false) };
  }
  const fresh = GUIDES.find((g) => !rows.some((x) => x.guide === g.slug));
  return fresh ? { guide: fresh, status: "nieuw" as const, pct: 0 } : null;
}
