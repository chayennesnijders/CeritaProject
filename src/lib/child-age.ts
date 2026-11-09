import { dayNumber, PARENT_FOR_CHILD, PARENT_QUESTIONS } from "@/lib/parent";

/**
 * Parents choose the age group(s) of their child(ren), never a birthdate. The daily tip for their
 * child and the question to ask then fit that age. Stored only in parent_settings (owner-only).
 */
export const CHILD_BANDS = [
  { id: "0-3", label: "0–3 jaar", emoji: "👶", name: "baby of peuter" },
  { id: "4-9", label: "4–9 jaar", emoji: "🧒", name: "basisschoolkind" },
  { id: "10-12", label: "10–12 jaar", emoji: "🎒", name: "bijna-tiener" },
  { id: "13-15", label: "13–15 jaar", emoji: "🧑", name: "jonge tiener" },
  { id: "16-18", label: "16–18 jaar", emoji: "🧑‍🎓", name: "oudere tiener" },
  { id: "19+", label: "19 jaar of ouder", emoji: "🧑‍💼", name: "jongvolwassene" },
] as const;
export type ChildBand = (typeof CHILD_BANDS)[number]["id"];
export const isChildBand = (x: string): x is ChildBand => CHILD_BANDS.some((b) => b.id === x);
export const bandInfo = (id: ChildBand) => CHILD_BANDS.find((b) => b.id === id)!;

/** Daily tips per age group: small ways to show your child you are there. */
export const BAND_TIPS: Record<ChildBand, readonly string[]> = {
  "0-3": [
    "Benoem vandaag hardop wat je kindje voelt: ‘je schrikt, hè? Ik ben hier.’",
    "Leg je telefoon weg tijdens het voeden of eten en kijk je kindje aan.",
    "Zing een liedje tijdens het verschonen of in bad. Herhaling geeft veiligheid.",
    "Kruip op de grond en speel tien minuten mee, op de hoogte van je kind.",
    "Lees samen een boekje, ook als je kind alleen naar de plaatjes kijkt.",
    "Troost na een huilbui eerst, leg pas later uit. Zo leert je kind: ik ben veilig.",
    "Maak een vast rustig ritueel voor het slapengaan, elke avond hetzelfde.",
    "Laat je kind vandaag iets zelf proberen, ook als het langer duurt.",
    "Praat tegen je kindje over wat je doet: ‘nu doen we je jas aan’.",
    "Neem zelf even pauze als je merkt dat je geduld op is. Dat is goed ouderschap.",
  ],
  "4-9": [
    "Vraag niet ‘hoe was school?’, maar ‘waar heb je vandaag om gelachen?’",
    "Speel vandaag een spelletje dat je kind kiest, en laat je kind de regels uitleggen.",
    "Geef een compliment voor moeite, niet voor het resultaat: ‘wat heb je goed doorgezet’.",
    "Lees voor of laat je kind voorlezen, ook als het al zelf kan lezen.",
    "Help je kind een gevoel een naam te geven: ‘ben je boos of teleurgesteld?’",
    "Laat je kind meehelpen met koken of een klusje, en bedank het echt.",
    "Vraag bij het naar bed gaan: ‘wat was het fijnste en wat het stomste van vandaag?’",
    "Zeg sorry als je eerder boos was. Zo leer je je kind dat fouten maken mag.",
    "Plan een kwartier alleen met dit kind, zonder broertjes of zusjes.",
    "Laat een briefje of tekeningetje achter in de broodtrommel.",
  ],
  "10-12": [
    "Vraag naar de vriendengroep: ‘met wie trek je nu het meest op?’",
    "Praat vandaag terloops over de overstap naar de middelbare school, of hoe die bevalt.",
    "Spreek samen af hoe de telefoon gebruikt wordt, in plaats van regels op te leggen.",
    "Laat je kind je een spel of app laten zien die het leuk vindt.",
    "Vraag: ‘is er iets wat je spannend vindt deze week?’",
    "Geef je kind een klein beetje meer vrijheid, en zeg dat je erop vertrouwt.",
    "Klop aan voordat je de kamer binnengaat. Privacy wordt nu belangrijker.",
    "Praat over lichaamsveranderingen voordat je kind erom vraagt, rustig en zonder lacherigheid.",
    "Zeg: ‘je kunt mij altijd alles vertellen, ook als je denkt dat ik boos word.’",
    "Vraag naar online dingen: ‘zie jij weleens iets geks of naars online?’",
  ],
  "13-15": [
    "Rijd, wandel of kook samen. Naast elkaar praat vaak makkelijker dan tegenover elkaar.",
    "Luister vijf minuten zonder advies te geven. Alleen knikken en doorvragen.",
    "Vraag naar muziek of een serie die je kind leuk vindt, en luister of kijk mee.",
    "Stuur overdag een berichtje: ‘ik denk aan je 💛’. Verwacht geen antwoord.",
    "Merk een emotie op zonder oordeel: ‘je lijkt een beetje moe vandaag.’",
    "Vraag niet waarom, maar wat: ‘wat maakte het zo lastig?’",
    "Laat merken dat een slecht cijfer niets verandert aan hoeveel je van je kind houdt.",
    "Accepteer een kort antwoord. Probeer het later gewoon nog eens.",
    "Vraag: ‘bij wie kun jij terecht als het niet goed gaat?’",
    "Praat over vriendschap en verliefdheid zonder te plagen.",
  ],
  "16-18": [
    "Vraag je kind om advies over iets. Laat merken dat je zijn of haar mening waardeert.",
    "Praat over plannen voor later zonder druk: ‘waar word jij blij van?’",
    "Spreek samen af wat jullie verwachten bij uitgaan, in plaats van alleen regels te geven.",
    "Zeg dat je kind je altijd mag bellen om opgehaald te worden, zonder vragen achteraf.",
    "Vraag naar werk, bijbaan of stage: wat gaat goed, wat is lastig?",
    "Laat je kind zelf een keuze maken waar jij het niet helemaal mee eens bent.",
    "Vertel iets over toen jij zo oud was, ook iets wat niet goed ging.",
    "Vraag: ‘wat kan ik doen waardoor jij je beter voelt deze week?’",
    "Praat open over alcohol, drugs en grenzen, zonder preek.",
    "Eet samen, ook als het maar één keer deze week lukt.",
  ],
  "19+": [
    "Stuur een berichtje zonder vraag erin: ‘fijne dag, ik denk aan je.’",
    "Vraag hoe het écht gaat met studie, werk of wonen, en luister zonder te sturen.",
    "Bied hulp aan zonder het over te nemen: ‘wil je dat ik meedenk, of alleen luister?’",
    "Respecteer keuzes die anders zijn dan jij zou maken.",
    "Plan iets samen wat jullie allebei leuk vinden, bijvoorbeeld een wandeling of lunch.",
    "Vraag naar vrienden en relaties met interesse, niet met zorgen.",
    "Zeg dat je kind altijd welkom is, ook als het even niet lukt.",
    "Vraag: ‘wat zou je willen dat ik beter snap van jouw leven?’",
    "Laat merken dat je trots bent op wie je kind geworden is.",
    "Vraag of geldzorgen of stress meespelen, zonder oordeel.",
  ],
};

/** For babies and toddlers: something to do together. For older children: a question to ask. */
export const BAND_QUESTIONS: Record<ChildBand, readonly string[]> = {
  "0-3": [
    "Doe samen ‘kiekeboe’ en kijk hoe je kindje lacht.",
    "Wijs dingen aan tijdens een wandeling en zeg wat het is.",
    "Zing samen een liedje met gebaren.",
    "Bouw een toren en laat je kind hem omgooien.",
    "Speel in bad met bekertjes en water overgieten.",
    "Lees een boekje en laat je kind dieren aanwijzen.",
  ],
  "4-9": [
    "Waar heb je vandaag om gelachen?",
    "Wie was er vandaag aardig tegen je?",
    "Als je een superkracht mocht kiezen, welke zou het zijn?",
    "Wat vond je vandaag moeilijk?",
    "Met wie speel je het liefst in de pauze?",
    "Wat wil je later worden, en waarom?",
    "Wat maakt jou blij als je verdrietig bent?",
    "Wat zou jij doen als je een dag de baas was thuis?",
  ],
  "10-12": [
    "Wie is je beste vriend of vriendin op dit moment, en waarom?",
    "Wat vind je spannend aan de middelbare school?",
    "Wat kijk je graag online? Laat eens zien.",
    "Is er iets in de klas waar je je zorgen over maakt?",
    "Wat vind je van jezelf een goede eigenschap?",
    "Waar kijk je deze week naar uit?",
    "Wat zou je graag eens samen met mij willen doen?",
    "Wat doen jouw vrienden als iemand verdrietig is?",
  ],
  "13-15": [
    "Welk liedje zit nu in je hoofd?",
    "Wat vind je het lastigste aan deze week?",
    "Waar ben je trots op, van de afgelopen tijd?",
    "Wat helpt jou als je je rot voelt?",
    "Welke docent vind je het fijnst, en waarom?",
    "Is er iets wat je me al een tijdje wilt vertellen?",
    "Wat zou je willen dat volwassenen beter begrijpen over jongeren?",
    "Wanneer voelde je je deze week echt ontspannen?",
  ],
  "16-18": [
    "Waar droom je over, voor later?",
    "Wat vind je het fijnst aan thuis, en wat mag anders?",
    "Wat zou je tegen je jongere zelf zeggen?",
    "Wat geeft jou op dit moment de meeste stress?",
    "Bij wie voel je je het meest jezelf?",
    "Wat wil je dit jaar nog leren of proberen?",
    "Hoe merk ik dat het niet goed met je gaat?",
    "Wat is iets wat ik nog niet van je weet?",
  ],
  "19+": [
    "Waar word je op dit moment het meest blij van?",
    "Wat is het lastigste aan zelfstandig zijn?",
    "Waar ben je trots op, van het afgelopen jaar?",
    "Wat zou je willen dat ik vaker deed, of juist minder?",
    "Hoe gaat het met je vrienden?",
    "Wat wil je over vijf jaar anders hebben?",
    "Wat heb je van thuis meegenomen waar je blij mee bent?",
    "Wanneer heb je voor het laatst echt rust gehad?",
  ],
};

/** Round-robin over the chosen age groups, so with two children both get a turn. */
function interleave(lists: readonly (readonly string[])[]): { text: string; band: number }[] {
  const out: { text: string; band: number }[] = [];
  const longest = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < longest; i++) lists.forEach((l, b) => l[i] && out.push({ text: l[i]!, band: b }));
  return out;
}

const sorted = (bands: readonly ChildBand[]) =>
  CHILD_BANDS.map((b) => b.id).filter((id) => bands.includes(id));

/** Today's tip for your child: fits the chosen age groups, or a general tip when none is chosen. */
export function childTip(day: string, bands: readonly ChildBand[]): { text: string; band: ChildBand | null } {
  const chosen = sorted(bands);
  const n = dayNumber(day);
  if (!chosen.length) {
    const i = (((n + 7) % PARENT_FOR_CHILD.length) + PARENT_FOR_CHILD.length) % PARENT_FOR_CHILD.length;
    return { text: PARENT_FOR_CHILD[i]!, band: null };
  }
  const pool = interleave(chosen.map((b) => BAND_TIPS[b]));
  const pick = pool[((n % pool.length) + pool.length) % pool.length]!;
  return { text: pick.text, band: chosen[pick.band]! };
}

/** Today's tips: one for every chosen age group (in age order), or one general tip when none is chosen. */
export function childTips(day: string, bands: readonly ChildBand[]): { text: string; band: ChildBand | null }[] {
  const chosen = sorted(bands);
  if (!chosen.length) return [childTip(day, [])];
  const n = dayNumber(day);
  return chosen.map((b) => {
    const list = BAND_TIPS[b];
    return { text: list[((n % list.length) + list.length) % list.length]!, band: b };
  });
}

/** The questions (or things to do together) for the chosen age groups. */
export function childQuestions(bands: readonly ChildBand[]): { text: string; band: ChildBand | null; together: boolean }[] {
  const chosen = sorted(bands);
  if (!chosen.length) return PARENT_QUESTIONS.map((text) => ({ text, band: null, together: false }));
  return interleave(chosen.map((b) => BAND_QUESTIONS[b])).map((q) => ({
    text: q.text,
    band: chosen[q.band]!,
    together: chosen[q.band] === "0-3",
  }));
}

/** "13–15 jaar" or "4–9 en 13–15 jaar". */
export function bandsLabel(bands: readonly ChildBand[]): string {
  const labels = sorted(bands).map((b) => bandInfo(b).label.replace(" jaar", "").replace(" of ouder", "+"));
  if (!labels.length) return "";
  if (labels.length === 1) return `${labels[0]} jaar`;
  return `${labels.slice(0, -1).join(", ")} en ${labels.at(-1)} jaar`;
}
