/**
 * The test questions: young testers answer TEST_FORM at /testen, parents PARENT_FORM at /testlijst.
 * A short list they fill in and send today. Answers are saved live in tester_progress.notes (by
 * question id) and sent to the admins as one message.
 */
export type TestFormQuestion =
  | { id: string; kind: "choice"; label: string; options: readonly string[] }
  | { id: string; kind: "multi"; label: string; options: readonly string[] }
  | { id: string; kind: "text"; label: string; placeholder: string }
  | { id: string; kind: "score"; label: string };

export const TEST_FORM: readonly TestFormQuestion[] = [
  { id: "telefoon", kind: "choice", label: "Wat voor telefoon heb je?", options: ["Android", "iPhone"] },
  {
    id: "wanneer",
    kind: "multi",
    label: "Wanneer open je de app meestal? Tik alles aan wat klopt.",
    options: ["’s Ochtends", "Na school of werk", "’s Avonds", "Vlak voor het slapen", "Als ik me rot voel", "Als ik een melding krijg"],
  },
  {
    id: "meest",
    kind: "multi",
    label: "Wat gebruik je het meest? Tik alles aan wat klopt.",
    options: [
      "Groepen",
      "Privéchat",
      "Verhalen lezen of swipen",
      "CeritaBuddy",
      "Diertje",
      "Stemming",
      "Dagboek",
      "Vraag aan een coach",
      "Rustmoment",
      "Spelletje in de chat",
    ],
  },
  { id: "drie-woorden", kind: "text", label: "De app in drie woorden?", placeholder: "Bijvoorbeeld: gezellig, rustig, veilig" },
  { id: "leukst", kind: "text", label: "Wat vind je het fijnst aan de app?", placeholder: "Wat je maar wilt" },
  { id: "werkt-niet", kind: "text", label: "Wat werkt niet, of doet raar?", placeholder: "Wat deed je, en wat gebeurde er?" },
  { id: "onduidelijk", kind: "text", label: "Wat is onduidelijk of irritant?", placeholder: "Ook kleine dingen helpen" },
  { id: "veilig", kind: "choice", label: "Voelt de app veilig?", options: ["Ja", "Een beetje", "Nee", "Weet ik niet"] },
  { id: "veilig-waarom", kind: "text", label: "Waarom voelt het zo?", placeholder: "Alles wat je opviel" },
  { id: "missen", kind: "text", label: "Wat zou je missen als de app er niet meer was?", placeholder: "Of: niks, en waarom" },
  { id: "mis", kind: "text", label: "Wat mis je nog in de app?", placeholder: "Iets wat je graag zou willen" },
  { id: "cijfer", kind: "score", label: "Hoe groot is de kans dat je de app blijft gebruiken? (1–10)" },
  { id: "waarom", kind: "text", label: "Waarom dit cijfer?", placeholder: "Kort mag" },
];

/** For parents: only about their own experience, never about their child's details. */
export const PARENT_FORM: readonly TestFormQuestion[] = [
  { id: "telefoon", kind: "choice", label: "Wat voor telefoon heb je?", options: ["Android", "iPhone"] },
  {
    id: "wanneer",
    kind: "multi",
    label: "Wanneer open je de app meestal? Tik alles aan wat klopt.",
    options: ["’s Ochtends", "Overdag", "’s Avonds", "Vlak voor het slapen", "Na een lastig moment", "Als ik een melding krijg"],
  },
  {
    id: "meest",
    kind: "multi",
    label: "Wat gebruik je het meest? Tik alles aan wat klopt.",
    options: [
      "Opdracht voor mezelf",
      "Tip voor mijn kind",
      "Vraag van de dag voor mijn kind",
      "Handleidingen",
      "Stemming",
      "Rustmoment",
      "Dankbaarheidspotje",
      "Dagboek",
      "Diertje",
      "Brief aan mezelf",
    ],
  },
  { id: "drie-woorden", kind: "text", label: "De app in drie woorden?", placeholder: "Bijvoorbeeld: rustig, herkenbaar, handig" },
  { id: "leukst", kind: "text", label: "Wat vind je het fijnst aan de app?", placeholder: "Wat je maar wilt" },
  { id: "werkt-niet", kind: "text", label: "Wat werkt niet, of doet raar?", placeholder: "Wat deed je, en wat gebeurde er?" },
  { id: "onduidelijk", kind: "text", label: "Wat is onduidelijk of irritant?", placeholder: "Ook kleine dingen helpen" },
  {
    id: "contact",
    kind: "choice",
    label: "Hielp de app je in het contact met je kind?",
    options: ["Ja", "Een beetje", "Nee", "Nog niet geprobeerd"],
  },
  { id: "contact-hoe", kind: "text", label: "Wat merkte je daarvan?", placeholder: "Kort mag. Namen zijn niet nodig." },
  { id: "betalen", kind: "choice", label: "Zou je betalen voor de handleidingen?", options: ["Ja", "Misschien", "Nee"] },
  { id: "betalen-wat", kind: "text", label: "Voor welk deel, en wat zou het je waard zijn?", placeholder: "Eerlijk zeggen mag, ook ‘niks’" },
  { id: "mis", kind: "text", label: "Wat mis je nog in de app?", placeholder: "Iets wat je graag zou willen" },
  { id: "cijfer", kind: "score", label: "Hoe groot is de kans dat je de app blijft gebruiken? (1–10)" },
  { id: "waarom", kind: "text", label: "Waarom dit cijfer?", placeholder: "Kort mag" },
];

/** For teachers: about the lessons and the dashboard, never about pupils by name. */
export const TEACHER_FORM: readonly TestFormQuestion[] = [
  {
    id: "les",
    kind: "multi",
    label: "Welke les(sen) heb je gegeven of bekeken? Tik alles aan wat klopt.",
    options: ["Je bent niet de enige", "Druk in je hoofd", "Online en offline", "Nog geen les gegeven"],
  },
  { id: "groep", kind: "multi", label: "In welke groep? Tik alles aan wat klopt.", options: ["Groep 7/8", "Klas 1 t/m 3", "Klas 4 t/m 6"] },
  { id: "klas", kind: "text", label: "Hoe reageerde de klas?", placeholder: "Wat werkte goed, wat minder? Geen namen van leerlingen nodig." },
  { id: "handleiding", kind: "choice", label: "Was de handleiding duidelijk?", options: ["Ja", "Grotendeels", "Nee"] },
  { id: "voorbereiding", kind: "choice", label: "Hoeveel tijd kostte de voorbereiding?", options: ["Minder dan 15 min", "15–30 min", "30–60 min", "Meer dan een uur"] },
  { id: "tijd", kind: "choice", label: "Paste de les in de tijd?", options: ["Ja", "Te kort", "Te lang"] },
  { id: "zorg", kind: "choice", label: "Kwam er iets zorgelijks naar boven?", options: ["Nee", "Ja, en ik wist wat ik moest doen", "Ja, en dat vond ik lastig"] },
  { id: "dashboard", kind: "text", label: "Wat vind je van de app voor leraren (lessen, tip, opdrachtje, dagboek)?", placeholder: "Wat is handig, wat is onduidelijk?" },
  { id: "werkt-niet", kind: "text", label: "Wat werkt niet, of doet raar?", placeholder: "Wat deed je, en wat gebeurde er?" },
  { id: "mis", kind: "text", label: "Welke les of welk onderwerp mis je nog?", placeholder: "Bijvoorbeeld: pesten, rouw, thuissituatie…" },
  { id: "betalen", kind: "choice", label: "Zou je school hiervoor betalen?", options: ["Ja", "Misschien", "Nee", "Weet ik niet"] },
  { id: "betalen-wat", kind: "text", label: "Wat zou het jullie waard zijn, en wie beslist dat op school?", placeholder: "Eerlijk zeggen mag, ook ‘niks’" },
  { id: "cijfer", kind: "score", label: "Hoe groot is de kans dat je een les van CeritaProject nog eens geeft? (1–10)" },
  { id: "waarom", kind: "text", label: "Waarom dit cijfer?", placeholder: "Kort mag" },
];

export type TestFormAnswers = Record<string, string>;

const filled = (v: string | undefined) => !!v && v.trim() !== "";

/** How many questions have an answer. */
export const answeredCount = (a: TestFormAnswers, form: readonly TestFormQuestion[] = TEST_FORM) =>
  form.filter((q) => filled(a[q.id])).length;

/** Something worth sending: at least one answer. */
export const hasAnyAnswer = (a: TestFormAnswers, form: readonly TestFormQuestion[] = TEST_FORM) =>
  answeredCount(a, form) > 0;

/** The questions still open, in order (all must be answered before sending). */
export const openQuestions = (a: TestFormAnswers, form: readonly TestFormQuestion[] = TEST_FORM) =>
  form.filter((q) => !filled(a[q.id]));
export const allAnswered = (a: TestFormAnswers, form: readonly TestFormQuestion[] = TEST_FORM) =>
  openQuestions(a, form).length === 0;

/** Multi-choice answers are stored as "A, B, C". */
export const splitMulti = (v: string | undefined) => (v ? v.split(", ").filter(Boolean) : []);
export const joinMulti = (list: readonly string[]) => list.join(", ");

/** The message sent to the admins (max 2000 characters, the limit of admin_messages). */
export function feedbackMessage(a: TestFormAnswers, form: readonly TestFormQuestion[] = TEST_FORM) {
  const lines = [
    form === PARENT_FORM ? "🧪 Testfeedback (ouder)" : form === TEACHER_FORM ? "🧪 Testfeedback (leraar)" : "🧪 Testfeedback",
    `${answeredCount(a, form)} van ${form.length} vragen beantwoord`,
    ...form.map((q) => `\n${q.label}\n${(a[q.id] ?? "").trim() || "–"}`),
  ];
  const text = lines.join("\n");
  return text.length > 2000 ? `${text.slice(0, 1997)}…` : text;
}
