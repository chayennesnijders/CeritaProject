/**
 * The parents' corner: each day one small assignment for the parent's own wellbeing and one tip to
 * show their child they are there. Parents have their own account type (profiles.is_parent): no
 * birthdate, no groups, no chats, and never any view of a child's data.
 */

/** Small, doable things for the parent themselves. */
export const PARENT_SELF = [
  "Drink vandaag je koffie of thee zonder telefoon. Vijf minuten alleen voor jou.",
  "Schrijf drie dingen op die vandaag goed gingen, hoe klein ook.",
  "Ga tien minuten naar buiten. Een rondje om het huis telt ook.",
  "Vraag vandaag zelf om hulp bij iets, al is het maar een klein ding.",
  "Zeg vandaag één keer ‘nee’ tegen iets wat je eigenlijk niet wilt.",
  "Adem drie keer heel langzaam uit voordat je reageert op iets wat je irriteert.",
  "Bel of app iemand bij wie je je even niet sterk hoeft voor te doen.",
  "Ga vanavond een half uur eerder naar bed.",
  "Doe vandaag iets wat je vroeger leuk vond, al is het maar tien minuten.",
  "Merk op wanneer je vandaag streng bent tegen jezelf. Zeg dan: ‘ik doe mijn best’.",
  "Eet vandaag één maaltijd rustig aan tafel, zonder scherm.",
  "Schrijf op wat je zorgen geeft. Zet erachter: kan ik hier nu iets aan doen?",
  "Luister naar een liedje dat je vrolijk maakt, en zing gerust mee.",
  "Bedenk één ding waar je als ouder trots op bent.",
  "Leg je telefoon een uur in een andere kamer.",
  "Rek je even uit: armen omhoog, schouders los, nek rustig draaien.",
  "Stuur iemand een berichtje om te bedanken.",
  "Plan deze week één moment dat alleen van jou is, en zet het in je agenda.",
  "Vergeef jezelf één fout van deze week. Iedereen maakt ze.",
  "Doe vandaag het rustmoment in de app: twee minuten ademhalen.",
  "Kijk vandaag even naar de lucht. Gewoon kijken, nergens aan denken.",
  "Zeg hardop tegen jezelf: ‘ik hoef niet alles alleen te doen’.",
  "Ruim één klein hoekje op. Een opgeruimde plek geeft rust in je hoofd.",
  "Vraag je partner, vriend of familielid: ‘hoe gaat het écht met jou?’",
  "Drink vandaag genoeg water. Zet een glas klaar waar je het ziet.",
  "Schrijf een kort briefje aan jezelf van over een jaar.",
  "Ga vandaag een keer zitten zonder iets te doen. Vijf minuten is genoeg.",
  "Lees iets wat niets met werk of opvoeden te maken heeft.",
  "Merk op hoe je je vandaag voelt, en vul het in bij je stemming.",
  "Vier vandaag iets kleins: een klusje af, een moeilijk gesprek gevoerd.",
] as const;

/** Small ways to show a child you are there. Works for 12-year-olds and for young adults alike. */
export const PARENT_FOR_CHILD = [
  "Vraag niet ‘hoe was school?’, maar ‘wat was vandaag het leukste moment?’",
  "Zeg vandaag zomaar dat je trots bent, zonder dat er een reden is.",
  "Luister vijf minuten zonder advies te geven. Alleen knikken en doorvragen.",
  "Stuur een berichtje overdag: ‘ik denk aan je 💛’.",
  "Vraag je kind om je iets te leren: een spel, een liedje, een app.",
  "Rijd, wandel of kook samen. Naast elkaar praat vaak makkelijker dan tegenover elkaar.",
  "Vraag: ‘is er iets waar je je zorgen over maakt?’ en accepteer ook ‘nee’.",
  "Geef een compliment over wie je kind is, niet over een cijfer.",
  "Zeg sorry als je eerder boos of kortaf was. Zo leer je je kind dat dat mag.",
  "Laat je kind vanavond kiezen wat jullie eten of kijken.",
  "Vraag naar een vriend of vriendin: ‘hoe gaat het eigenlijk met …?’",
  "Vertel iets over toen jij zo oud was, ook iets wat niet goed ging.",
  "Leg je telefoon weg als je kind iets vertelt. Laat zien dat het belangrijk is.",
  "Vraag: ‘wat kan ik doen waardoor jij je beter voelt deze week?’",
  "Klop aan voordat je de kamer binnengaat. Respect voor privacy bouwt vertrouwen.",
  "Zeg: ‘je kunt mij altijd alles vertellen, ook als je denkt dat ik boos word.’",
  "Plan een kwartier één-op-één tijd, zonder broers of zussen.",
  "Vraag naar muziek of een serie die je kind leuk vindt, en kijk of luister mee.",
  "Merk een emotie op zonder oordeel: ‘je lijkt een beetje moe vandaag.’",
  "Vraag niet waarom, maar wat: ‘wat maakte het zo lastig?’",
  "Laat een briefje achter in een tas of op het kussen.",
  "Vraag: ‘bij wie kun jij terecht als het niet goed gaat?’",
  "Vertel je kind wat je vandaag zelf moeilijk vond, en hoe je ermee omging.",
  "Lach samen ergens om. Zoek een grappig filmpje en kijk het samen.",
  "Vraag na een ruzie later rustig: ‘zullen we het nog eens proberen?’",
  "Bied hulp aan zonder het over te nemen: ‘wil je dat ik meedenk, of alleen luister?’",
  "Zeg goedenacht met een vast zinnetje, ook als je kind al groot is.",
  "Vraag je kind wat het fijn vindt aan zichzelf.",
  "Laat merken dat een slecht cijfer niets verandert aan hoeveel je van je kind houdt.",
  "Vraag: ‘wat zou je willen dat ik beter snap van jouw leven?’",
] as const;

/** Day number since 1 Jan 2026 for a YYYY-MM-DD date, so everyone sees the same item on the same day. */
export function dayNumber(day: string): number {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(2026, 0, 1)) / 86_400_000);
}

const pick = <T,>(list: readonly T[], day: string, shift = 0) =>
  list[(((dayNumber(day) + shift) % list.length) + list.length) % list.length]!;

/** Today's assignment for the parent and today's tip for their child. */
export function parentDay(day: string) {
  return { self: pick(PARENT_SELF, day), child: pick(PARENT_FOR_CHILD, day, 7) };
}

/** Pages a parent may open. Everything else in the app is for young people. */
export const PARENT_PAGES = ["/home", "/ouderhoek", "/stemming", "/rust", "/dankbaar", "/brieven", "/profiel", "/meldingen", "/beheer", "/zoeken", "/handleidingen", "/testlijst", "/dagboek", "/diertje"] as const;
export const parentMayOpen = (path: string) =>
  PARENT_PAGES.some((p) => path === p || path.startsWith(`${p}/`));

/** Help lines for parents themselves (the young people's lines are elsewhere). */
export const PARENT_HELP = [
  { name: "De Luisterlijn", what: "als je even met iemand wilt praten, dag en nacht", phone: "088-0767000" },
  { name: "113 Zelfmoordpreventie", what: "als jij of je kind aan zelfmoord denkt", phone: "0800-0113" },
  { name: "Veilig Thuis", what: "bij zorgen over geweld of onveiligheid thuis", phone: "0800-2000" },
  { name: "Je huisarts of het CJG", what: "voor advies over opvoeden en hulp in de buurt", phone: null },
] as const;

/** Phone numbers in a form a phone can dial (tel: link). */
export const telHref = (phone: string) => `tel:${phone.replace(/[^0-9+]/g, "")}`;

/** Questions to start a conversation with your child, one at a time on the home screen. */
export const PARENT_QUESTIONS = [
  "Wat was vandaag het leukste moment van je dag?",
  "Waar heb je vandaag om gelachen?",
  "Wie was er vandaag aardig tegen je?",
  "Is er iets waar je je zorgen over maakt?",
  "Wat zou je doen als je een dag geen school had en alles mocht?",
  "Welk liedje zit nu in je hoofd?",
  "Wat vind je het lastigste aan deze week?",
  "Waar ben je trots op, van de afgelopen tijd?",
  "Wat zou je graag eens samen met mij willen doen?",
  "Wie is je beste vriend of vriendin op dit moment, en waarom?",
  "Wat is iets wat ik nog niet van je weet?",
  "Als je één ding thuis mocht veranderen, wat zou dat zijn?",
  "Wat helpt jou als je je rot voelt?",
  "Wat kijk je graag op je telefoon? Laat eens zien.",
  "Welke docent vind je het fijnst, en waarom?",
  "Waar kijk je deze week naar uit?",
  "Wat vind je van jezelf een goede eigenschap?",
  "Is er iets wat je me al een tijdje wilt vertellen?",
  "Wat zou je tegen je jongere zelf zeggen?",
  "Wanneer voelde je je deze week echt ontspannen?",
  "Wat doen jouw vrienden als iemand verdrietig is?",
  "Waar droom je over, voor later?",
  "Wat vind je het fijnst aan thuis?",
  "Wat zou je willen dat volwassenen beter begrijpen over jongeren?",
] as const;

/** A different question each time (never the same one twice in a row). */
export function nextQuestion(current: number, random = Math.random, n: number = PARENT_QUESTIONS.length): number {
  if (n <= 1) return 0;
  return (current + 1 + Math.floor(random() * (n - 1))) % n;
}

/** Today's progress: assignment for yourself, tip for your child and (on the parent home) your mood. */
export function todayProgress(p: { self: boolean; child: boolean; mood?: boolean | undefined }) {
  const parts = [p.self, p.child, ...(p.mood === undefined ? [] : [p.mood])];
  return { done: parts.filter(Boolean).length, total: parts.length };
}

/** Monday to Sunday of the week of `day`, with whether something was done that day. */
export function weekDots(day: string, doneDays: readonly string[]) {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  const monday = new Date(date.getTime() - ((date.getUTCDay() + 6) % 7) * 86_400_000);
  const done = new Set(doneDays);
  return ["ma", "di", "wo", "do", "vr", "za", "zo"].map((label, i) => {
    const iso = new Date(monday.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    return { day: iso, label, done: done.has(iso), today: iso === day, future: iso > day };
  });
}

/** What the parent home answers when a parent picks a mood, with one fitting next step. */
export const PARENT_MOOD_REPLY: Record<string, { text: string; to: string; link: string }> = {
  super: { text: "Wat fijn! Zeg vandaag eens hardop tegen je kind waar je blij van werd.", to: "/dankbaar", link: "🫙 Zet het in je dankbaar potje" },
  goed: { text: "Mooi. Een goede dag is een goed moment voor een klein gesprek.", to: "/handleidingen", link: "📘 Bekijk een handleiding" },
  "gaat-wel": { text: "Oké is ook goed. Je hoeft niet altijd alles op orde te hebben.", to: "/rust", link: "🫧 Neem 2 minuten rust" },
  verdrietig: { text: "Wat naar dat je je zo voelt. Je hoeft het niet alleen te dragen: De Luisterlijn is er dag en nacht (088-0767000).", to: "/rust", link: "🫧 Even ademen" },
  gestrest: { text: "Zorgen om je kind kosten veel energie. Neem even tijd voor jezelf, dat is ook goed voor je kind.", to: "/rust", link: "🫧 Rustmoment van 2 minuten" },
};
