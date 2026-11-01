import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

/**
 * Help for publishing stories: check spelling and sentences (keeping the writer's own voice), and
 * make a calm banner illustration that fits the story. Only admins reach this (checked in the
 * server function).
 */
function provider() {
  const key = process.env["OPENAI_API_KEY"];
  if (!key) throw new Error("AI is niet ingesteld (OPENAI_API_KEY ontbreekt in Vercel).");
  return { key, ai: createOpenAI({ apiKey: key }) };
}
const model = () => process.env["OPENAI_MODEL"] ?? "gpt-5-mini";

function friendly(error: unknown): never {
  const status =
    (error as { statusCode?: number; status?: number })?.statusCode ??
    (error as { status?: number })?.status;
  if (status === 402)
    throw new Error("Het OpenAI-tegoed is op. Vul het aan op platform.openai.com.");
  if (status === 429)
    throw new Error("Even te veel verzoeken. Probeer het over een minuutje opnieuw.");
  throw new Error(
    error instanceof Error ? error.message : "De AI gaf geen antwoord. Probeer het opnieuw.",
  );
}

const PROOFREAD = `Je bent eindredacteur van CeritaProject: echte, persoonlijke verhalen van Nederlandse jongeren (13–27 jaar).
Verbeter ALLEEN: spelling, hoofdletters, leestekens, kromme of onduidelijke zinnen, en zinnen die te lang doorlopen.
Belangrijk:
- Behoud de eigen stem, toon en woordkeus van de schrijver. Herschrijf niet en maak het niet "netter" dan nodig.
- Voeg niets toe, laat niets weg, verander niets aan de inhoud of de gevoelens.
- Laat alinea's staan; maak van een hele lange lap tekst wel een paar alinea's.
- Laat regels als [[foto:...]] precies staan.
Antwoord met alleen JSON: {"title": "...", "body": "..."} (body met \\n\\n tussen alinea's).`;

export async function proofreadStory(title: string, body: string) {
  const { ai } = provider();
  try {
    const { text } = await generateText({
      model: ai.responses(model()),
      system: PROOFREAD,
      messages: [{ role: "user", content: JSON.stringify({ title, body }) }],
      providerOptions: { openai: { reasoningEffort: "low", store: false } },
    });
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as {
      title?: string;
      body?: string;
    };
    if (!json.title?.trim() || !json.body?.trim())
      throw new Error("De AI gaf een onvolledig antwoord. Probeer het opnieuw.");
    return { title: json.title.trim().slice(0, 150), body: json.body.trim() };
  } catch (e) {
    friendly(e);
  }
}

const SCENE = `Bedenk één rustige, symbolische scène voor een bannerillustratie bij een persoonlijk verhaal van een jongere.
Regels: geen tekst of letters in beeld, geen herkenbare gezichten, niets schokkends, geen geweld, geen bloed, geen medische details.
Kies iets beeldends en hoopvols dat bij het gevoel past (bijv. een raam met ochtendlicht, een bankje in een park, twee mokken thee, een pad door het bos).
Antwoord met één Engelse zin van maximaal 30 woorden, alleen de scène.`;

/** A banner picture (JPEG, base64) for a story. */
export async function illustrateStory(title: string, body: string) {
  const { key, ai } = provider();
  let scene: string;
  try {
    const r = await generateText({
      model: ai.responses(model()),
      system: SCENE,
      messages: [{ role: "user", content: `Titel: ${title}\n\n${body.slice(0, 3000)}` }],
      providerOptions: { openai: { reasoningEffort: "low", store: false } },
    });
    scene = r.text.trim().slice(0, 300);
  } catch (e) {
    friendly(e);
  }
  const prompt = `${scene} Soft, warm hand-drawn storybook illustration, gentle pastel palette of blush pink, cream and warm brown with a touch of sage green, cosy and hopeful mood, wide banner composition, no text, no letters, no logos.`;
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env["OPENAI_IMAGE_MODEL"] ?? "gpt-image-1",
      prompt,
      size: "1536x1024",
      quality: "medium",
      output_format: "jpeg",
      output_compression: 82,
      n: 1,
    }),
  });
  if (!res.ok) {
    if (res.status === 402 || res.status === 429) friendly({ status: res.status });
    const err = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(
      `Een plaatje maken lukte niet${err?.error?.message ? `: ${err.error.message}` : "."}`,
    );
  }
  const data = (await res.json()) as { data?: { b64_json?: string }[] };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("Een plaatje maken lukte niet. Probeer het opnieuw.");
  return { base64: b64 };
}
