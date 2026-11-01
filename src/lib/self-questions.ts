/**
 * "Vraag van de dag" in the diary: one question a day to get to know yourself better and grow your
 * self-confidence (the two personal needs young people named most in the CeritaProject surveys).
 * Everyone gets the same question on the same day; the answer stays private in the diary.
 */
export const SELF_QUESTIONS = [
  // Jezelf leren kennen
  "Waar krijg jij energie van?",
  "Wat kost jou juist veel energie?",
  "Wanneer voel je je het meest jezelf?",
  "Bij wie kun jij helemaal jezelf zijn? Waarom bij die persoon?",
  "Wat is iets wat je heel graag doet, ook als niemand kijkt?",
  "Welke drie woorden passen bij jou?",
  "Wat zouden je vrienden zeggen dat je goed kunt?",
  "Waar maak je je de laatste tijd vaak zorgen over?",
  "Wat helpt jou als je verdrietig bent?",
  "Wat helpt jou als je boos bent?",
  "Welk liedje past bij hoe je je nu voelt? Waarom?",
  "Wat is een herinnering waar je altijd blij van wordt?",
  "Waar droom je van voor later?",
  "Wat vind je belangrijk in een vriendschap?",
  "Wat is iets wat je anders doet dan de meeste mensen?",
  "Welke plek geeft jou rust?",
  "Wat zou je doen als je een dag niks hoefde?",
  "Waar ben je stiekem nieuwsgierig naar?",
  "Wat heb je dit jaar over jezelf geleerd?",
  "Wat is iets wat mensen vaak verkeerd over jou denken?",
  "Wanneer heb je voor het laatst hardop gelachen? Waarom?",
  "Wat zou je tegen jezelf van een jaar geleden zeggen?",
  "Welke grens wil jij beter leren aangeven?",
  "Wat mis je weleens?",
  "Wat maakt een dag voor jou een goede dag?",
  // Zelfvertrouwen
  "Waar ben je trots op, ook al is het klein?",
  "Noem iets wat je vroeger moeilijk vond en nu wel kunt.",
  "Welk compliment heb je ooit gekregen dat je bijbleef?",
  "Wat is een eigenschap van jou die je eigenlijk best leuk vindt?",
  "Wanneer was je moedig, ook al was je bang?",
  "Wat zou je tegen een vriend(in) zeggen die zich voelt zoals jij nu?",
  "Wat doe jij goed voor andere mensen?",
  "Welk doel wil je deze week halen, hoe klein ook?",
  "Wat is iets waar je beter in bent geworden?",
  "Schrijf drie dingen op die je leuk vindt aan jezelf.",
  "Waar zou je meer van willen durven?",
  "Wat helpt jou om weer op te staan als iets mislukt?",
  "Wie inspireert jou, en wat heb jij gemeen met die persoon?",
  "Welke kritische gedachte over jezelf mag je vandaag loslaten?",
  "Wat heb je deze week gedaan dat je goed deed?",
  "Wat maakt jou uniek?",
  "Welke stap zet je morgen voor jezelf?",
  "Wat zou je doen als je zeker wist dat niemand je raar zou vinden?",
  "Wat is iets wat je jezelf mag vergeven?",
  "Hoe zou je jezelf omschrijven aan iemand die je nog niet kent?",
] as const;

/** The question for a day ("YYYY-MM-DD"): the same for everyone, a different one every day. */
export function questionForDay(day: string) {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const n = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  return SELF_QUESTIONS[
    ((n % SELF_QUESTIONS.length) + SELF_QUESTIONS.length) % SELF_QUESTIONS.length
  ]!;
}
