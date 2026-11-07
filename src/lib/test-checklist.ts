/**
 * The checklist for testers (Beheer → Testers shows it live). Parents use /testlijst; young people
 * use the existing test week at /testen (src/lib/test-week.ts). Item ids are stable, so progress
 * survives text changes.
 */
import { TEST_CHECKLIST, TEST_QUESTIONS } from "@/lib/test-week";

export type TesterRole = "ouder" | "jongere";
export type TestItem = { id: string; title: string; hint: string };
export type TestPhase = { id: string; title: string; when: string; items: TestItem[] };
export type TestQuestion = { id: string; question: string; placeholder: string };

const PARENT: TestPhase[] = [
  {
    id: "start",
    title: "Beginnen",
    when: "Dag 1 · ongeveer 5 minuten",
    items: [
      { id: "o-s1", title: "Account gemaakt met ‘Ik ben ouder’", hint: "Op app.ceritaproject.nl → Account maken." },
      { id: "o-s2", title: "E-mail bevestigd", hint: "Niet gezien? Kijk in je spam- of reclamemap." },
      { id: "o-s3", title: "App op je beginscherm gezet", hint: "iPhone: Safari → Deel → Zet op beginscherm. Android: Chrome → ⋮ → Toevoegen aan startscherm." },
      { id: "o-s4", title: "Leeftijd van je kind gekozen", hint: "Bovenaan je startscherm. Meer kinderen? Kies meerdere." },
    ],
  },
  {
    id: "dag",
    title: "Elke dag",
    when: "Ongeveer 2 minuten · vink af als het een paar dagen gelukt is",
    items: [
      { id: "o-d1", title: "Opdracht voor jezelf gedaan", hint: "Bij 🌿 Voor jezelf, en tik op Gedaan." },
      { id: "o-d2", title: "Tip voor je kind geprobeerd", hint: "Bij 💛 Voor je kind." },
      { id: "o-d3", title: "Ingevuld hoe je je voelt", hint: "Alleen jij ziet je antwoord." },
      { id: "o-d4", title: "Een vraag van de dag aan je kind gesteld", hint: "Bij ‘Vraag het je kind eens’." },
    ],
  },
  {
    id: "week1",
    title: "Week 1",
    when: "Wanneer het je uitkomt",
    items: [
      { id: "o-w1", title: "Eén handleiding helemaal gedaan", hint: "Bijvoorbeeld ‘Het gesprek beginnen als je je zorgen maakt’." },
      { id: "o-w2", title: "Je plan gekozen en het spiekbriefje bekeken", hint: "Aan het eind van de handleiding." },
      { id: "o-w3", title: "Een rustmoment gedaan", hint: "Via Rust onderin." },
      { id: "o-w4", title: "Iets in je dankbaar potje gezet", hint: "Wat ging er vandaag goed?" },
    ],
  },
  {
    id: "week2",
    title: "Week 2",
    when: "Nog een stapje verder",
    items: [
      { id: "o-v1", title: "‘Hoe ging het met je plan?’ beantwoord", hint: "Verschijnt twee dagen na je handleiding." },
      { id: "o-v2", title: "Een tweede handleiding geprobeerd", hint: "Schermtijd, pesten, schoolweigering of coming-out." },
      { id: "o-v3", title: "Een brief aan jezelf geschreven", hint: "Via Profiel → Brief aan jezelf." },
      { id: "o-v4", title: "Een screenshot gestuurd van iets wat raar deed", hint: "Of: niets geks gezien. Dan mag je hem ook afvinken." },
    ],
  },
];

/** Young testers use the existing test week at /testen; its checklist is shown live here too. */
const YOUTH: TestPhase[] = TEST_CHECKLIST.map((g, n) => ({
  id: `j${n}`,
  title: g.title,
  when: "",
  items: g.items.map((i) => ({ id: i.id, title: i.text, hint: "" })),
}));

const PARENT_QUESTIONS: TestQuestion[] = [
  { id: "q1", question: "Wat gebruikte je het meest, en wat sloeg je over?", placeholder: "Bijvoorbeeld: de vraag voor mijn kind elke avond…" },
  { id: "q2", question: "Wanneer opende je de app meestal?", placeholder: "Bijvoorbeeld ’s avonds, of na een lastig moment" },
  { id: "q3", question: "Zou je betalen voor de handleidingen? Zo ja, voor welk deel?", placeholder: "Eerlijk zeggen mag, ook ‘nee’" },
  { id: "q4", question: "Nog iets anders? (fijn, onhandig, ideeën)", placeholder: "Alles is welkom" },
];

const YOUTH_QUESTIONS: TestQuestion[] = TEST_QUESTIONS.map((q) => ({ id: q.id, question: q.label, placeholder: "" }));

/** Where a tester ticks their list. */
export const testPath = (role: TesterRole) => (role === "ouder" ? "/testlijst" : "/testen");

export const testPhases = (role: TesterRole) => (role === "ouder" ? PARENT : YOUTH);
export const testQuestions = (role: TesterRole) => (role === "ouder" ? PARENT_QUESTIONS : YOUTH_QUESTIONS);
export const testItems = (role: TesterRole) => testPhases(role).flatMap((p) => p.items);

/** Progress over a role's list; checks for unknown ids (an older list) are ignored. */
export function testProgress(role: TesterRole, checks: Record<string, boolean | undefined>) {
  const phases = testPhases(role).map((p) => ({
    id: p.id,
    title: p.title,
    done: p.items.filter((i) => checks[i.id]).length,
    total: p.items.length,
  }));
  const done = phases.reduce((a, p) => a + p.done, 0);
  const total = phases.reduce((a, p) => a + p.total, 0);
  return { phases, done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

/** "net", "3 uur geleden", "2 dagen geleden": how long ago a tester was last busy. */
export function lastSeen(iso: string, now = Date.now()): string {
  const min = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (min < 2) return "net";
  if (min < 60) return `${min} min geleden`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} uur geleden`;
  const d = Math.round(h / 24);
  return d === 1 ? "gisteren" : `${d} dagen geleden`;
}
