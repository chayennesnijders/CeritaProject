/**
 * Which AI model answers. Kept in one place so another provider can be added later without
 * touching the chat: add a branch here (and its API key in the environment).
 */
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export type BuddyModel = { model: LanguageModel; providerOptions: Record<string, Record<string, string | boolean>> };

export function buddyModel(name: string): BuddyModel {
  const key = process.env["OPENAI_API_KEY"];
  if (!key) throw new Error("AI is niet ingesteld (OPENAI_API_KEY ontbreekt).");
  const openai = createOpenAI({ apiKey: key });
  const reasoning = /^(gpt-5|o\d)/.test(name);
  return {
    model: openai.responses(name),
    // store: false — OpenAI keeps no copy of the conversation for its own use.
    providerOptions: { openai: reasoning ? { reasoningEffort: "low", store: false } : { store: false } },
  };
}

/** Second safety layer next to the word patterns: OpenAI's (free) moderation check. Null if unavailable. */
export async function moderate(text: string) {
  const key = process.env["OPENAI_API_KEY"];
  if (!key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "omni-moderation-latest", input: text }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { results?: { categories?: Record<string, boolean>; category_scores?: Record<string, number> }[] };
    const c = json.results?.[0]?.categories ?? {};
    const s = json.results?.[0]?.category_scores ?? {};
    return {
      selfHarm: !!c["self-harm"] || (s["self-harm"] ?? 0) > 0.3,
      selfHarmIntent: !!c["self-harm/intent"] || !!c["self-harm/instructions"],
      violence: !!c["violence"] && (s["violence"] ?? 0) > 0.6,
      sexualMinors: !!c["sexual/minors"],
    };
  } catch {
    return null;
  }
}
