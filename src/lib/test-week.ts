/**
 * The test questions for young testers (/testen), who already use the app (almost) every day: a
 * short list they can fill in and send today. Answers are saved live in tester_progress.notes (by
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

export type TestFormAnswers = Record<string, string>;

const filled = (v: string | undefined) => !!v && v.trim() !== "";

/** How many questions have an answer. */
export const answeredCount = (a: TestFormAnswers) => TEST_FORM.filter((q) => filled(a[q.id])).length;

/** Something worth sending: at least one answer. */
export const hasAnyAnswer = (a: TestFormAnswers) => answeredCount(a) > 0;

/** The questions still open, in order (all must be answered before sending). */
export const openQuestions = (a: TestFormAnswers) => TEST_FORM.filter((q) => !filled(a[q.id]));
export const allAnswered = (a: TestFormAnswers) => openQuestions(a).length === 0;

/** Multi-choice answers are stored as "A, B, C". */
export const splitMulti = (v: string | undefined) => (v ? v.split(", ").filter(Boolean) : []);
export const joinMulti = (list: readonly string[]) => list.join(", ");

/** The message sent to the admins (max 2000 characters, the limit of admin_messages). */
export function feedbackMessage(a: TestFormAnswers) {
  const lines = [
    "🧪 Testfeedback",
    `${answeredCount(a)} van ${TEST_FORM.length} vragen beantwoord`,
    ...TEST_FORM.map((q) => `\n${q.label}\n${(a[q.id] ?? "").trim() || "–"}`),
  ];
  const text = lines.join("\n");
  return text.length > 2000 ? `${text.slice(0, 1997)}…` : text;
}
