/**
 * Teachers have their own account type (profiles.is_teacher, set only through become_teacher(code)
 * with a working school code). Like parents they have no birthdate, so they never reach groups,
 * chats, other profiles or CeritaBuddy. In the app they only see their lessons and their profile.
 */

import { dayNumber } from "@/lib/parent";

/** Pages a teacher may open (their diary is private, like everyone's). Everything else is for young people. */
export const TEACHER_PAGES = ["/home", "/dagboek", "/profiel", "/beheer"] as const;
export const teacherMayOpen = (path: string) =>
  TEACHER_PAGES.some((p) => path === p || path.startsWith(`${p}/`));

/** Lessons first: unlocked ones before locked ones, each in the order the admin set. */
export function sortForTeacher<T extends { unlocked: boolean }>(lessons: readonly T[]): T[] {
  return [...lessons.filter((l) => l.unlocked), ...lessons.filter((l) => !l.unlocked)];
}

/** "31 juli 2027" for a licence end date (YYYY-MM-DD). */
export const licenceEnd = (day: string) =>
  new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T12:00:00Z`));

/** One practical tip a day on giving lessons about wellbeing. */
export const TEACHER_TIPS = [
  "Begin een les over gevoelens altijd met de afspraken: niets moet, we lachen niemand uit, en luisteren is ook meedoen.",
  "Stilte na een vraag is goed. Tel in je hoofd tot tien voordat je zelf iets zegt; vaak komt er dan pas een antwoord.",
  "Vraag niet ‘Wie herkent dit?’, maar ‘Hoe zou iemand zich voelen als…?’. Over een ander praten is veiliger dan over jezelf.",
  "Beloof een leerling nooit dat je iets geheimhoudt. Zeg: ‘Als ik me zorgen maak, vraag ik hulp, zodat jij geholpen wordt.’",
  "Vertelt een leerling iets zorgelijks? Luister, bedank, en zeg dat je erop terugkomt. Je hoeft het niet meteen op te lossen.",
  "Laat de zorgcoördinator altijd van tevoren weten dat je een les over welzijn geeft. Dan weet je bij wie je terechtkunt.",
  "Zet een doos neer voor anonieme briefjes. Sommige leerlingen durven pas te schrijven als niemand kijkt.",
  "Laat zelf ook iets kleins zien, bijvoorbeeld: ‘Ik vind maandagochtend ook weleens zwaar.’ Dat maakt het veilig om eerlijk te zijn.",
  "Gaat het gesprek over pesten in je eigen klas? Ga er niet in de groep op in. Zeg dat je het apart oppakt, en doe dat ook.",
  "Een leerling die lacht of grapjes maakt bij een zwaar onderwerp, voelt zich vaak juist ongemakkelijk. Benoem het rustig, zonder te straffen.",
  "Kijk na de les wie stil werd of snel wegliep. Een kort ‘Alles goed?’ bij de deur kan veel betekenen.",
  "Gebruik bij een klassengesprek een praatvoorwerp: alleen wie het vasthoudt praat. Dat geeft rust en iedereen komt aan bod.",
  "Geef leerlingen altijd een uitweg: ‘Je mag ook alleen luisteren’ of ‘Je mag even naar de gang als het te veel is.’",
  "Schrijf de hulpnummers op het bord: Kindertelefoon 0800-0432 en 113 (0800-0113). Laat ze er de hele les staan.",
  "Herhaal belangrijke boodschappen in elke les. Eén keer ‘je bent niet de enige’ horen is mooi; vaker horen blijft hangen.",
  "Vraag na een les een cijfer van 1 tot 5: ‘Hoe was dit voor je?’ Op een briefje, zonder naam. Zo weet je wat werkt.",
  "Werk met kleine groepjes van drie. In een groepje durven leerlingen meer dan voor de hele klas.",
  "Plan na een zware les iets luchtigs, zoals een spelletje of naar buiten. Zo gaat niemand met een zwaar hoofd naar huis.",
  "Je hoeft geen hulpverlener te zijn. Jouw taak is opmerken, luisteren en doorverwijzen. Dat is al heel veel.",
  "Let op leerlingen die ineens veranderen: stiller, bozer, vaak ziek of moe. Noteer wat je ziet en bespreek het met de zorgcoördinator.",
  "Gebruik echte verhalen, maar altijd anoniem. Zeg erbij dat het verhaal echt is, zodat leerlingen voelen dat het ertoe doet.",
  "Zeg vaker wat je ziet dan wat je denkt: ‘Ik zie dat je moe bent’ werkt beter dan ‘Je hebt vast niet geslapen.’",
  "Vraag ‘wat’ in plaats van ‘waarom’. ‘Wat maakte het lastig?’ voelt minder als een verhoor dan ‘Waarom deed je dat?’",
  "Begin de les met een korte check-in: duim omhoog, opzij of omlaag. Zo voel je de sfeer voordat je begint.",
  "Een les die anders loopt dan gepland, is niet mislukt. Als leerlingen echt praten, is dat het doel.",
  "Bespreek met een collega hoe een les ging. Ook jij mag je verhaal kwijt na een zware les.",
  "Laat leerlingen zelf afspraken bedenken voor de les. Afspraken die ze zelf maken, houden ze beter vol.",
  "Complimenteer de klas voor hoe ze met elkaar omgingen, niet alleen voor de antwoorden.",
  "Ademhalen helpt ook in de klas: laat de klas drie keer rustig in- en uitademen voor een toets of na de pauze.",
  "Vertelt een leerling over gevaar voor zichzelf of een ander? Blijf bij de leerling, haal er direct een collega of de zorgcoördinator bij, en bel bij acuut gevaar 112.",
  "Zorg ook goed voor jezelf. Een leraar die rust heeft, geeft leerlingen rust.",
] as const;

/** One small thing to try in class today. */
export const TEACHER_TASKS = [
  "Vraag vandaag bij binnenkomst aan drie leerlingen hoe het écht met ze gaat, en luister naar het antwoord.",
  "Begin één les met een check-in: duim omhoog, opzij of omlaag.",
  "Geef vandaag een leerling een compliment over wie hij of zij is, niet over een cijfer.",
  "Zet de hulpnummers (Kindertelefoon 0800-0432, 113) ergens in je lokaal waar iedereen ze ziet.",
  "Spreek één leerling aan die de laatste tijd stiller is: ‘Ik zie je. Als je wilt praten, ben ik er.’",
  "Doe aan het begin van de les een minuut ademhaling met de klas.",
  "Zet een anonieme vragendoos neer en vertel de klas dat ze er alles in mogen doen.",
  "Vraag aan het eind van de les: ‘Wat was vandaag het fijnste moment?’",
  "Laat de klas in tweetallen één ding noemen waar ze goed in zijn.",
  "Groet vandaag elke leerling bij de deur met naam.",
  "Vertel de klas iets kleins wat jij moeilijk vond toen je zo oud was als zij.",
  "Laat leerlingen op een briefje schrijven bij wie zij terechtkunnen als het niet goed gaat. Ze hoeven het niet in te leveren.",
  "Plan deze week één les van CeritaProject in je agenda, en laat het de zorgcoördinator weten.",
  "Lees de handleiding van je volgende les door en kies één vraag die je zeker wilt stellen.",
  "Vraag een leerling die vaak de clown uithangt na de les hoe het met hem of haar gaat.",
  "Laat vandaag iemand anders dan de bekende praters als eerste antwoord geven.",
  "Schrijf op het bord: ‘Je bent niet de enige.’ Laat het de hele dag staan.",
  "Bespreek met één collega hoe het met een leerling gaat over wie je je zorgen maakt.",
  "Sluit de les af met: ‘Je mag altijd bij mij terecht.’ Zeg het hardop.",
  "Laat de klas samen drie afspraken maken over hoe jullie met elkaar praten.",
  "Vraag na een pauze: ‘Wie heeft vandaag iemand geholpen?’ en geef die leerling een compliment.",
  "Laat leerlingen een minuut stil iets opschrijven of tekenen over hoe hun week gaat. Niemand leest het.",
  "Kijk vandaag bewust naar de leerling die altijd achterin zit. Maak één keer oogcontact en glimlach.",
  "Vraag de klas om één ding te noemen dat hen helpt als ze gestrest zijn. Schrijf de antwoorden op het bord.",
  "Neem vijf minuten voor jezelf na je laatste les, zonder telefoon of nakijkwerk.",
  "Vertel de klas dat praten over gevoelens normaal is, net als praten over het weer.",
  "Laat de klas in groepjes van drie bedenken wat je kunt zeggen tegen een vriend die verdrietig is.",
  "Schrijf voor jezelf op welke leerling je deze week extra aandacht wilt geven.",
  "Vraag een leerling om je iets te leren: een spel, een liedje of een woord.",
  "Bedank vandaag een collega voor iets wat diegene voor een leerling deed.",
  "Vraag na een les een cijfer van 1 tot 5 op een briefje: ‘Hoe was dit voor je?’",
] as const;

/** A question for the teacher's own diary. */
export const TEACHER_REFLECT = [
  "Welk moment in de klas raakte je vandaag?",
  "Welke leerling zag je vandaag echt, en wat zag je?",
  "Wat ging er vandaag goed, hoe klein ook?",
  "Waar maak je je zorgen over, en met wie kun je dat delen?",
  "Wat heb je vandaag van een leerling geleerd?",
  "Waar ben je trots op als leraar, deze week?",
  "Wat zou je morgen anders willen doen?",
  "Wat gaf je vandaag energie, en wat kostte energie?",
  "Welk gesprek blijft in je hoofd zitten?",
  "Hoe zorg jij vanavond goed voor jezelf?",
  "Welke leerling wil je deze week extra aandacht geven, en waarom?",
  "Wat zou je tegen jezelf zeggen als je je eigen collega was?",
  "Wanneer voelde je je vandaag rustig in de klas?",
  "Wat wil je onthouden van deze week?",
] as const;

const pick = <T>(list: readonly T[], day: string, shift = 0) =>
  list[(((dayNumber(day) + shift) % list.length) + list.length) % list.length]!;

/** Today's tip, class task and diary question for teachers (the same for every teacher that day). */
export function teacherDay(day: string) {
  return {
    tip: pick(TEACHER_TIPS, day),
    task: pick(TEACHER_TASKS, day, 11),
    reflect: pick(TEACHER_REFLECT, day, 3),
  };
}
