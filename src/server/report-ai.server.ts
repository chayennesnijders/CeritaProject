import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const SYSTEM = `Je helpt beheerders van CeritaProject, een veilige Nederlandstalige app voor jongeren (12–27 jaar), met het afhandelen van meldingen.
Geef in het Nederlands:
SAMENVATTING: 1–3 zinnen, neutraal.
ERNST: laag, middel of hoog (met korte reden).
VERVOLGSTAPPEN: 3–5 concrete stappen als lijst (bijv. bericht verbergen, gebruiker waarschuwen, contact opnemen, doorverwijzen naar hulp zoals 113 of Kindertelefoon bij zorgen over veiligheid).
Wees kort en praktisch. Verzin geen feiten die niet in de melding staan.`;

export async function runReportAnalysis(text: string): Promise<{ result: string }> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is niet geconfigureerd.");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  let failure: unknown;
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    system: SYSTEM,
    messages: [{ role: "user", content: `Melding:\n${text}` }],
    providerOptions: {
      openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] },
    },
    onError: ({ error }) => { failure = error; },
  });
  const out = await result.text;
  if (failure || !out.trim()) {
    const status = (failure as { statusCode?: number })?.statusCode;
    if (status === 402) throw new Error("De AI-tegoeden zijn op. Vul ze aan via Instellingen → Plans & credits.");
    if (status === 429) throw new Error("Even te veel verzoeken. Probeer het over een minuutje opnieuw.");
    throw new Error("De AI kon geen samenvatting maken.");
  }
  return { result: out.trim() };
}
