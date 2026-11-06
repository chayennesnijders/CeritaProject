/**
 * CeritaBuddy: the pure building blocks shared by the chat screen and the server.
 * (The system instruction itself lives on the server: src/server/buddy/prompt.ts.)
 */
import { CARE_PATTERN } from "@/lib/care";

/** Optional ways to start a conversation. The buddy also works without picking one. */
export const BUDDY_MODES = [
  {
    id: "verhaal",
    emoji: "💬",
    label: "Even mijn verhaal kwijt",
    starter: "Ik wil even mijn verhaal kwijt.",
    hint: "De jongere wil vooral haar of zijn verhaal kwijt. Luister, reageer op de inhoud, stel één vervolgvraag en kom niet meteen met oplossingen. Vraag op een natuurlijk moment of de jongere wil dat je luistert of dat jullie samen kijken wat ze ermee kan.",
  },
  {
    id: "voelen",
    emoji: "🫶",
    label: "Help me begrijpen wat ik voel",
    starter: "Ik weet niet zo goed wat ik voel. Kun je me helpen?",
    hint: "Help gevoelens herkennen en onderscheiden, mogelijke oorzaken en lichaamssignalen verkennen en ontdekken wat de jongere nodig heeft. Bied mogelijkheden, geen conclusies of diagnoses. Keuzes (KEUZES:) helpen hier vaak.",
  },
  {
    id: "wat-doen",
    emoji: "🧭",
    label: "Ik weet niet wat ik moet doen",
    starter: "Ik zit vast en weet niet wat ik moet doen.",
    hint: "Onderzoek de situatie stap voor stap, één stap per beurt: wat is er gebeurd, wat weet je zeker, wat denk je dat er speelt, welke verklaringen zijn er nog, welke opties zijn er, wat is een kleine eerste stap. Neem geen beslissingen voor de jongere.",
  },
  {
    id: "relativeren",
    emoji: "🌤️",
    label: "Help me relativeren",
    starter: "Ik blijf maar piekeren. Help je me relativeren?",
    hint: "Help onderscheid maken tussen feiten, gedachten, aannames, angsten en verwachtingen. Benoem vriendelijk wanneer iets een conclusie is en geen feit, en zoek samen naar andere verklaringen.",
  },
  {
    id: "kletsen",
    emoji: "☕",
    label: "Gewoon kletsen",
    starter: "Ik wil gewoon even kletsen.",
    hint: "Een luchtig gesprek: muziek, series, hobby's, de dag. Maak het niet zwaar, wees nieuwsgierig en gebruik gerust wat humor. Schakel wel mee als het gesprek serieuzer wordt.",
  },
  {
    id: "zelfvertrouwen",
    emoji: "💪",
    label: "Zelfvertrouwen",
    starter: "Ik wil werken aan mijn zelfvertrouwen.",
    hint: "Onderwerpen als onzekerheid, vergelijken, zelfbeeld, grenzen, voor jezelf opkomen, fouten maken en angst voor afwijzing. Gebruik kleine, praktische reflectievragen en oefeningen, één tegelijk.",
  },
  {
    id: "relaties",
    emoji: "🤝",
    label: "Vriendschap, liefde en familie",
    starter: "Ik zit met iets in een vriendschap of relatie.",
    hint: "Vriendschappen, liefde, familie, groepsdruk, ruzies, eenzaamheid, grenzen en communicatie. Kies niet zomaar partij, bekijk meerdere perspectieven en benoem ongezonde situaties voorzichtig.",
  },
] as const;
export type BuddyModeId = (typeof BUDDY_MODES)[number]["id"];
export const buddyMode = (id: string | null | undefined) => BUDDY_MODES.find((m) => m.id === id) ?? null;

/** App pages the buddy may point to with [[app:key]]. Only these exist; anything else is ignored. */
export const BUDDY_LINKS = {
  rust: { emoji: "🫧", label: "Rustmoment", to: "/rust" },
  verhalen: { emoji: "📖", label: "Verhalen lezen", to: "/ontdekken" },
  community: { emoji: "👥", label: "Naar de groepen", to: "/community" },
  dagboek: { emoji: "📓", label: "Mijn dagboek", to: "/dagboek" },
  stemming: { emoji: "📅", label: "Stemmingskalender", to: "/stemming" },
  coach: { emoji: "🎓", label: "Coaches (ook anoniem een vraag stellen)", to: "/vragen" },
  veiligheidsplan: { emoji: "🛟", label: "Mijn veiligheidsplan", to: "/veiligheidsplan" },
  dankbaar: { emoji: "🫙", label: "Dankbaar potje", to: "/dankbaar" },
  hulp: { emoji: "🆘", label: "Hulp en hulplijnen", to: "/hulp" },
} as const;
export type BuddyLinkKey = keyof typeof BUDDY_LINKS;

const SAFETY_MARK = "[[veilig]]";

export type ParsedReply = {
  text: string;
  choices: string[];
  links: BuddyLinkKey[];
  safety: boolean;
};

/**
 * Split a finished buddy reply into what is shown and the extras:
 * a "KEUZES: a | b | c" line becomes tap buttons, [[app:rust]] becomes a link button,
 * and a leading [[veilig]] means the model itself saw a safety concern.
 */
export function parseReply(raw: string): ParsedReply {
  let text = raw;
  const safety = text.includes(SAFETY_MARK);
  text = text.split(SAFETY_MARK).join("");

  const links: BuddyLinkKey[] = [];
  text = text.replace(/\[\[app:([a-z-]+)\]\]/gi, (_, key: string) => {
    const k = key.toLowerCase();
    if (k in BUDDY_LINKS && !links.includes(k as BuddyLinkKey)) links.push(k as BuddyLinkKey);
    return "";
  });

  let choices: string[] = [];
  const m = /(?:^|\n)\s*\**KEUZES\**\s*:\s*(.+)\s*$/i.exec(text);
  if (m) {
    choices = m[1]!
      .split("|")
      .map((c) => c.replace(/^[\s\-*•]*([A-Da-d][.)]\s*)?/, "").trim())
      .filter((c) => c.length > 0)
      .map((c) => c.slice(0, 80))
      .slice(0, 5);
    text = text.slice(0, m.index);
  }
  text = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return { text, choices, links: links.slice(0, 3), safety };
}

/** While a reply is still streaming in: hide the markers and a half-written KEUZES line. */
export function visibleWhileStreaming(raw: string): string {
  let text = raw.split(SAFETY_MARK).join("");
  text = text.replace(/\[\[app:[a-z-]*\]\]/gi, "");
  const k = text.search(/(?:^|\n)\s*\**KEUZES/i);
  if (k >= 0) text = text.slice(0, k);
  // A marker that is only half there yet, e.g. "[[ap" at the very end.
  text = text.replace(/\[\[?[a-z:-]*$/i, "");
  // "KEU" at the start of the last line could become KEUZES.
  text = text.replace(/(?:^|\n)\s*\**K(?:E(?:U(?:Z(?:E)?)?)?)?$/i, "");
  return text.trimStart();
}

/** Age bracket for the tone of voice (only the bracket is sent to the AI, not the birthdate). */
export type AgeBracket = "13-15" | "16-18" | "19-22" | "23-27" | "28+";
export function ageBracket(birthdate: string | null | undefined, now = new Date()): AgeBracket | null {
  if (!birthdate) return null;
  const b = new Date(birthdate);
  if (Number.isNaN(b.getTime())) return null;
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1;
  if (age < 16) return "13-15";
  if (age < 19) return "16-18";
  if (age < 23) return "19-22";
  if (age < 28) return "23-27";
  return "28+";
}

// ---------- Safety ----------

/** Signs of abuse, violence at home or sexual abuse (besides the suicide/self-harm words in care.ts). */
export const ABUSE_PATTERN =
  "(mishandel|misbruik|aangerand|verkracht|seksueel\\s+(\\S+\\s+){0,2}(dwing|misbruik|lastig)" +
  "|(slaat|schopt|stompt|knijpt|wurgt)\\s+(\\S+\\s+){0,2}(mij|me)\\b" +
  "|(mij|me)\\s+(\\S+\\s+){0,2}(geslagen|geschopt|gewurgd|opgesloten)" +
  "|bang\\s+(\\S+\\s+){0,2}(om\\s+)?(naar\\s+)?huis|durf\\s+(\\S+\\s+){0,2}niet\\s+(meer\\s+)?naar\\s+huis" +
  "|loverboy|naaktfoto|sextortion|chanteert\\s+(mij|me))";
/** Acute danger: something is happening right now, or a plan for today. */
export const DANGER_PATTERN =
  "(pillen\\s+(\\S+\\s+){0,3}(genomen|ingenomen|geslikt)|heb\\s+(\\S+\\s+){0,3}(ingenomen|geslikt)" +
  "|vannacht\\s+(\\S+\\s+){0,3}(einde|dood|zelfmoord)|vandaag\\s+(\\S+\\s+){0,3}(einde|dood|zelfmoord)" +
  "|sta\\s+(\\S+\\s+){0,3}(op\\s+het\\s+spoor|op\\s+de\\s+brug|op\\s+het\\s+dak)" +
  "|hij\\s+(\\S+\\s+){0,2}(staat|is)\\s+(\\S+\\s+){0,2}voor\\s+de\\s+deur|ik\\s+bloed\\s+(\\S+\\s+){0,2}(veel|erg)|ben\\s+in\\s+gevaar)";

const careRe = new RegExp(CARE_PATTERN, "i");
const abuseRe = new RegExp(ABUSE_PATTERN, "i");
const dangerRe = new RegExp(DANGER_PATTERN, "i");

/** What the separate AI safety check said about the newest message. */
export type AiSafetyCheck = "geen" | "zorg" | "acuut";

/** none: normal chat · zorg: show help and follow the safety protocol · acuut: also point to 112. */
export type SafetyLevel = "none" | "zorg" | "acuut";

/**
 * The safety layer: word patterns AND a separate AI check (and, after the reply, the model's own
 * [[veilig]] mark). Any one of them is enough; it never depends on a word list alone.
 */
export function assessSafety(text: string, aiCheck: AiSafetyCheck | null): SafetyLevel {
  if (dangerRe.test(text) || aiCheck === "acuut") return "acuut";
  if (careRe.test(text) || abuseRe.test(text) || aiCheck === "zorg") return "zorg";
  return "none";
}

// ---------- Context ----------

export type BuddyTurn = { role: "user" | "assistant"; content: string };

/**
 * Only the newest turns go to the AI (never the whole history), each trimmed, starting with
 * something the young person said.
 */
export function buildContext(history: BuddyTurn[], limit: number, maxChars = 3000): BuddyTurn[] {
  const recent = history.slice(-Math.max(1, limit)).map((t) => ({
    role: t.role,
    content: t.content.length > maxChars ? `${t.content.slice(0, maxChars)}…` : t.content,
  }));
  while (recent.length > 0 && recent[0]!.role !== "user") recent.shift();
  return recent;
}

/** A first title for a new conversation, from the first message. */
export function titleFrom(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "Nieuw gesprek";
  return clean.length > 40 ? `${clean.slice(0, 39).trimEnd()}…` : clean;
}

export const BUDDY_MAX_MESSAGE = 2000;

/** How many messages are left today: "ok", "bijna" (the last few) or "op". The count starts again at 00:00. */
export type LimitStage = "ok" | "bijna" | "op";
export const BUDDY_ALMOST = 5;
export function limitStage(remaining: number | null): LimitStage {
  if (remaining === null) return "ok";
  if (remaining <= 0) return "op";
  if (remaining <= BUDDY_ALMOST) return "bijna";
  return "ok";
}
