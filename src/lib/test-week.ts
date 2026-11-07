/**
 * The test week: a checklist for testers (ticked off on their own phone) and the closing questions,
 * which are sent to the admins as one message. Same content as docs/testplan.md.
 */
export const TEST_CHECKLIST: {
  title: string;
  items: { id: string; text: string; to?: string }[];
}[] = [
  {
    title: "🚪 Aanmelden en starten",
    items: [
      { id: "mail", text: "Bevestigingsmail ontvangen en erop geklikt (kijk ook in je spam)" },
      { id: "username", text: "Een gebruikersnaam gekozen" },
      { id: "relogin", text: "Uitgelogd en weer ingelogd" },
      { id: "forgot", text: "'Wachtwoord vergeten' geprobeerd" },
    ],
  },
  {
    title: "🏠 Home",
    items: [
      { id: "mood", text: "Je gevoel van vandaag gekozen bij Riti", to: "/home" },
      { id: "story-day", text: "Het verhaal van de dag gelezen", to: "/home" },
    ],
  },
  {
    title: "📖 Verhalen",
    items: [
      { id: "read", text: "Een paar verhalen gelezen en een reactie gegeven", to: "/ontdekken" },
      { id: "save", text: "Een verhaal opgeslagen", to: "/ontdekken" },
      { id: "submit", text: "Zelf een verhaal ingestuurd (mag kort)", to: "/verhaal-insturen" },
    ],
  },
  {
    title: "💬 Community en berichten",
    items: [
      { id: "join", text: "Lid geworden van een groep en iets gepost", to: "/community" },
      { id: "photo", text: "Een foto, tekening of spraakbericht gestuurd", to: "/community" },
      { id: "poll", text: "Een peiling gemaakt of ingevuld", to: "/community" },
      { id: "sticker", text: "Een sticker gestuurd", to: "/community" },
      { id: "game", text: "Een spelletje gespeeld met iemand", to: "/community" },
      { id: "checkin", text: "De check-in van de week ingevuld", to: "/community" },
      { id: "quick", text: "'Snel reageren' onder een bericht geprobeerd", to: "/community" },
      { id: "dm", text: "Een privégesprek gestart via een @gebruikersnaam", to: "/berichten" },
      { id: "report", text: "Een (test)bericht gemeld", to: "/community" },
    ],
  },
  {
    title: "🎓 Coaches",
    items: [
      { id: "ask", text: "Een anonieme vraag gesteld", to: "/vragen" },
      { id: "coach", text: "Gechat met een coach", to: "/vragen" },
    ],
  },
  {
    title: "🐰 Diertje",
    items: [
      { id: "pet", text: "Een diertje gekozen en verzorgd", to: "/diertje" },
      { id: "tasks", text: "Taken van vandaag afgevinkt", to: "/diertje" },
      { id: "minigame", text: "Een minigame gespeeld", to: "/diertje" },
    ],
  },
  {
    title: "🌱 Voor jezelf",
    items: [
      { id: "diary", text: "Een stukje in je dagboek geschreven", to: "/dagboek" },
      { id: "calendar", text: "Je stemmingskalender bekeken", to: "/stemming" },
      { id: "plan", text: "Je veiligheidsplan ingevuld", to: "/veiligheidsplan" },
      { id: "jar", text: "Je dankbaarheidspotje gevuld", to: "/dankbaar" },
      { id: "letter", text: "Een brief aan jezelf geschreven", to: "/brieven" },
      { id: "rest", text: "Een rustmoment gedaan", to: "/rust" },
      { id: "compliment", text: "Een compliment gestuurd", to: "/complimenten" },
      { id: "music", text: "Muziek geluisterd en daarna een ander scherm geopend", to: "/muziek" },
    ],
  },
  {
    title: "🔔 Meldingen en instellingen",
    items: [
      { id: "push", text: "Pushmeldingen aangezet", to: "/profiel" },
      { id: "push-closed", text: "Een melding gekregen terwijl de app dicht was" },
      { id: "quiet", text: "Stille uren ingesteld", to: "/profiel" },
      { id: "profile", text: "Je profielfoto en naam aangepast", to: "/profiel" },
      { id: "text", text: "Grotere letters en donkere modus geprobeerd", to: "/profiel" },
      { id: "offline", text: "De app geopend zonder internet" },
    ],
  },
];

export const TEST_ITEM_COUNT = TEST_CHECKLIST.reduce((n, g) => n + g.items.length, 0);

export const TEST_QUESTIONS = [
  { id: "leukst", label: "Wat vond je het leukst aan de app?" },
  { id: "onduidelijk", label: "Wat was onduidelijk of moeilijk?" },
  { id: "werkt-niet", label: "Wat werkte niet, of deed raar?" },
  { id: "mis", label: "Wat mis je nog?" },
] as const;

export type TestAnswers = {
  phone: string;
  score: number | null;
  why: string;
  answers: Record<string, string>;
};

/** The message sent to the admins (max 2000 characters, the limit of admin_messages). */
export function feedbackMessage(a: TestAnswers, done: number) {
  const lines = [
    done < TEST_ITEM_COUNT ? "🧪 Testfeedback (tussendoor, nog niet alles afgevinkt)" : "🧪 Testfeedback",
    `Telefoon: ${a.phone || "?"}`,
    `Checklist: ${done} van ${TEST_ITEM_COUNT} gedaan`,
    `Cijfer (blijf je de app gebruiken?): ${a.score ?? "?"}/10${a.why.trim() ? ` · ${a.why.trim()}` : ""}`,
    ...TEST_QUESTIONS.map((q) => `\n${q.label}\n${(a.answers[q.id] ?? "").trim() || "–"}`),
  ];
  const text = lines.join("\n");
  return text.length > 2000 ? `${text.slice(0, 1997)}…` : text;
}

/** Something worth sending: a phone, a score or any written answer (the checklist need not be done). */
export function hasAnyAnswer(a: TestAnswers): boolean {
  return !!a.phone || a.score !== null || !!a.why.trim() || Object.values(a.answers).some((v) => v.trim());
}
