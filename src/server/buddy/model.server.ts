/**
 * Which AI answers in CeritaBuddy: Claude (Anthropic). Kept in one place so another model or
 * provider can be added later without touching the chat.
 */
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, type LanguageModel } from "ai";
import type { AiSafetyCheck } from "@/lib/ceritabuddy";

export const DEFAULT_BUDDY_MODEL = "claude-haiku-5-5";

/** Room for Claude's (hidden) thinking on top of the visible answer. */
export const THINKING_ROOM = 1500;

function provider() {
  const key = process.env["ANTHROPIC_API_KEY"];
  if (!key) throw new Error("AI is niet ingesteld (ANTHROPIC_API_KEY ontbreekt).");
  return createAnthropic({ apiKey: key });
}

export type BuddyModel = { model: LanguageModel; providerOptions: { anthropic: { effort: "low" } } };

export function buddyModel(name: string): BuddyModel {
  const id = name.startsWith("claude-") ? name : DEFAULT_BUDDY_MODEL;
  // Low effort: quick, natural chat replies (thinking stays on, it is just brief).
  return { model: provider()(id), providerOptions: { anthropic: { effort: "low" } } };
}

const CHECK = `Je bent een veiligheidscheck voor een Nederlandstalige chat-app voor jongeren (13-27 jaar).
Lees het bericht van de jongere en antwoord met precies één woord:
ACUUT = er is nu of vandaag direct gevaar: iemand heeft zichzelf iets aangedaan of gaat dat nu doen, heeft pillen genomen, staat ergens om te springen, of wordt nu bedreigd of mishandeld.
ZORG = signalen van gedachten aan zelfdoding, zelfbeschadiging, mishandeling, (seksueel) misbruik, uitbuiting, grooming of ernstige psychische nood, ook als het indirect of verhuld gezegd wordt.
GEEN = al het andere, ook verdriet, ruzie, stress, een zieke oma, of grapjes en films waarin iets ergs voorkomt.
Antwoord alleen ACUUT, ZORG of GEEN.`;

/**
 * Second safety layer next to the word patterns: a short, separate Claude check of the newest
 * message (it understands hidden or indirect signals). Null if it could not run; the word
 * patterns and the model's own [[veilig]] mark still apply then.
 */
export async function aiSafetyCheck(text: string): Promise<AiSafetyCheck | null> {
  try {
    const { text: out } = await generateText({
      model: provider()(DEFAULT_BUDDY_MODEL),
      system: CHECK,
      messages: [{ role: "user", content: text }],
      maxOutputTokens: 1200,
      providerOptions: { anthropic: { effort: "low" } },
      abortSignal: AbortSignal.timeout(8000),
    });
    const word = out.trim().toUpperCase();
    if (word.includes("ACUUT")) return "acuut";
    if (word.includes("ZORG")) return "zorg";
    if (word.includes("GEEN")) return "geen";
    return null;
  } catch {
    return null;
  }
}
