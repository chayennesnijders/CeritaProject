/**
 * "Nog 48 dagen tot oud & nieuw": one question a day, counting down to a moment in the year. The same
 * questions are posted on TikTok each morning and wait in the app's diary, so young people can write
 * their own answer. Pure data; each theme has exactly one question per day of its window.
 */

export type Countdown = {
  id: string;
  /** Shown as "Nog 12 dagen tot {to}". */
  to: string;
  emoji: string;
  /** First and last day as MM-DD; the last day is the moment itself. */
  from: string;
  until: string;
  /** Shown on the last day instead of "Nog 0 dagen". */
  today: string;
  questions: readonly string[];
};

export const COUNTDOWNS: readonly Countdown[] = [
  {
    id: "oud-en-nieuw",
    to: "oud & nieuw",
    emoji: "🎆",
    from: "11-13",
    until: "12-31",
    today: "Vandaag is het oudjaar",
    questions: [
      "Waar ben je dit jaar het meest trots op, ook al weet niemand het?",
      "Welk moment van dit jaar zou je nog een keer willen beleven?",
      "Wie heeft jou dit jaar geholpen zonder dat diegene het weet?",
      "Wat heb je dit jaar over jezelf geleerd?",
      "Welk liedje hoort bij jouw jaar?",
      "Wat deed je dit jaar voor het eerst?",
      "Waar was je dit jaar bang voor, en is het ook gebeurd?",
      "Wie ben je dit jaar kwijtgeraakt, en wie heb je gevonden?",
      "Welke gewoonte wil je meenemen naar volgend jaar?",
      "En welke gewoonte laat je liever achter?",
      "Wanneer voelde je je dit jaar echt jezelf?",
      "Wat zou je tegen jezelf van januari willen zeggen?",
      "Welk compliment van dit jaar ben je nooit vergeten?",
      "Wat heb je dit jaar losgelaten?",
      "Waar heb je dit jaar het hardst om gelachen?",
      "Welke dag van dit jaar was moeilijk, en hoe kwam je erdoorheen?",
      "Wat wil je volgend jaar vaker doen, gewoon omdat je het leuk vindt?",
      "Wie wil je volgend jaar beter leren kennen?",
      "Wat vind je mooi aan jezelf, maar zeg je nooit hardop?",
      "Welke plek voelde dit jaar als thuis?",
      "Wat heb je dit jaar gedaan terwijl je het eigenlijk eng vond?",
      "Welke grens heb je dit jaar leren aangeven?",
      "Waar maak je je minder zorgen over dan vorig jaar?",
      "Wat zou je doen als je volgend jaar nergens bang voor was?",
      "Wie zou je vandaag een berichtje willen sturen, en waarom doe je het niet?",
      "Welk klein ding maakte jouw dagen dit jaar beter?",
      "Waar heb je dit jaar spijt van, en wat leer je daarvan?",
      "Welke droom heb je nog aan niemand verteld?",
      "Wanneer was je dit jaar lief voor jezelf?",
      "Wat wil je dat mensen over een jaar over jou zeggen?",
      "Welk boek, welke serie of film veranderde iets aan hoe je denkt?",
      "Wat heb je dit jaar gedaan voor iemand anders?",
      "Wat heb jij nodig om je veilig te voelen?",
      "Welke versie van jezelf mis je, en welke helemaal niet?",
      "Als je één ding uit dit jaar mocht houden, wat zou dat zijn?",
      "Waar wil je volgend jaar minder tijd aan besteden?",
      "Wie is er altijd voor je, ook als je er niet om vraagt?",
      "Welke gedachte over jezelf wil je volgend jaar niet meer geloven?",
      "Wat maakt jou anders dan iedereen, op een goede manier?",
      "Waar kijk je naar uit in de komende maanden?",
      "Waar ben je dit jaar doorheen gekomen, wat je vorig jaar niet had gedacht?",
      "Welk woord past bij jouw afgelopen jaar?",
      "En welk woord wil je dat bij volgend jaar past?",
      "Wat wens je je beste vriend of vriendin toe voor volgend jaar?",
      "Wat wens je jezelf toe?",
      "Wie wil je bedanken voordat het jaar voorbij is?",
      "Welke kleine belofte doe je aan jezelf voor januari?",
      "Hoe wil je je voelen als je over een jaar terugkijkt?",
      "Het jaar is bijna om. Wat wil je nu nog tegen jezelf zeggen?",
    ],
  },
  {
    id: "valentijn",
    to: "Valentijnsdag",
    emoji: "💌",
    from: "01-01",
    until: "02-14",
    today: "Vandaag is het Valentijnsdag",
    questions: [
      "Wat betekent liefde voor jou, in één zin?",
      "Bij wie voel jij je geliefd zoals je bent?",
      "Hoe laat jij merken dat je om iemand geeft?",
      "Hoe wil jij graag dat iemand laat merken dat die om jou geeft?",
      "Wat maakt iemand voor jou een echt goede vriend of vriendin?",
      "Wanneer voelde je je voor het laatst echt begrepen?",
      "Wat deed iemand ooit voor je wat je nooit vergeet?",
      "Wat zou je tegen jezelf zeggen als je je eigen beste vriend(in) was?",
      "Waarin ben jij al lief voor jezelf, en waarin nog niet?",
      "Wat is voor jou een rode vlag bij iemand?",
      "En wat is een groene vlag?",
      "Aan wie zou je een lieve brief willen schrijven, al is het als vriend(in)?",
      "Wat heb je geleerd van een vriendschap die voorbij is?",
      "Hoe voelt een veilige vriendschap of relatie voor jou?",
      "Welk liedje laat je denken aan iemand van wie je houdt?",
      "Wat vind je moeilijk aan iemand laten weten wat je voelt?",
      "Wanneer zeg jij ‘nee’, ook als de ander ‘ja’ wil?",
      "Wie laat jou lachen als niemand anders het kan?",
      "Wat wil je nooit meer accepteren in een vriendschap of relatie?",
      "Wat is het mooiste compliment dat je ooit kreeg?",
      "Aan wie denk je bij het woord ‘thuis’?",
      "Wat heb jij nodig als je verdrietig bent: praten, een knuffel of rust?",
      "Van wie heb jij geleerd wat liefde is?",
      "Wat zou je je jongere zelf vertellen over verliefd zijn?",
      "Hoe laat jij iemand weten dat je een grens hebt?",
      "Wat maakt dat jij iemand vertrouwt?",
      "Welke vriendschap wil je dit jaar meer aandacht geven?",
      "Wat vind je leuk aan jezelf als je bij je favoriete mensen bent?",
      "Wat doe je als iemand van wie je houdt je pijn doet?",
      "Hoe ziet een perfecte dag met je favoriete mens eruit?",
      "Wie mis je, en waarvoor zou je diegene willen bedanken?",
      "Wat is liefde níet, volgens jou?",
      "Wie zou je vandaag een compliment willen geven?",
      "Hoe voelt het als iemand echt naar je luistert?",
      "Wat heb je van je familie meegekregen over liefde?",
      "Wat wil jij later anders doen in de liefde?",
      "Waar word jij blij van in een vriendschap?",
      "Wanneer voel jij je mooi, ook als niemand het zegt?",
      "Durf jij te zeggen dat je iemand leuk vindt? Waarom wel of niet?",
      "Wat betekent ‘jezelf kunnen zijn’ bij iemand anders?",
      "Welke kleine dingen voelen voor jou als liefde?",
      "Wie zou je vandaag eens moeten bellen?",
      "Wat wil je dat jouw favoriete mensen over jou weten?",
      "Wat beloof jij jezelf over hoe je behandeld wilt worden?",
      "Wie verdient vandaag een lief berichtje van jou? Misschien ben jij het zelf.",
    ],
  },
];

const DAY = 86_400_000;
const utc = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));

/** The window of a countdown in a given year (a window never crosses New Year). */
const windowIn = (c: Countdown, year: number) => ({
  start: utc(`${year}-${c.from}`),
  end: utc(`${year}-${c.until}`),
});

/** Number of days in a countdown (= number of questions it needs). */
export const countdownLength = (c: Countdown, year = 2027) => {
  const w = windowIn(c, year);
  return Math.round((w.end - w.start) / DAY) + 1;
};

/** Today's countdown question for a day (YYYY-MM-DD), or null outside every countdown. */
export function countdownFor(day: string) {
  const t = utc(day);
  const year = +day.slice(0, 4);
  for (const c of COUNTDOWNS) {
    const w = windowIn(c, year);
    if (t < w.start || t > w.end) continue;
    const index = Math.round((t - w.start) / DAY);
    const total = Math.round((w.end - w.start) / DAY) + 1;
    const daysLeft = Math.round((w.end - t) / DAY);
    const question = c.questions[Math.min(index, c.questions.length - 1)]!;
    const headline =
      daysLeft === 0 ? c.today : `Nog ${daysLeft} ${daysLeft === 1 ? "dag" : "dagen"} tot ${c.to}`;
    return { id: c.id, emoji: c.emoji, headline, day: index + 1, total, daysLeft, question };
  }
  return null;
}
