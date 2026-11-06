import { beforeEach, describe, expect, it, vi } from "vitest";

// ---- A small fake database: records every call and answers from `state`. ----
type Call = { table: string; op: string; values?: unknown; filters: [string, unknown][] };
const calls: Call[] = [];
const state = {
  user: { id: "u1" } as { id: string } | null,
  settings: { enabled: true, model: "gpt-5-mini", daily_limit: 3, context_messages: 6, max_reply_tokens: 500, extra_instructions: "" } as Record<string, unknown> | null,
  accepted: true,
  birthdate: "2010-01-01",
  conversationOwner: "u1",
  used: 1,
  lastMessage: null as null | { role: string; content: string; created_at: string },
  history: [{ role: "user", content: "hoi" }] as { role: string; content: string }[],
};

function query(table: string) {
  const c: Call = { table, op: "select", filters: [] };
  calls.push(c);
  const result = () => {
    if (table === "buddy_settings") return { data: state.settings };
    if (table === "buddy_prefs") return { data: state.accepted ? { accepted_at: "2026-11-01" } : null };
    if (table === "profiles") return { data: { birthdate: state.birthdate } };
    if (table === "buddy_conversations" && c.op === "select") return { data: { id: "c1", user_id: state.conversationOwner } };
    if (table === "buddy_conversations" && c.op === "insert") return { data: { id: "c-new" }, error: null };
    if (table === "buddy_messages" && c.op === "select" && c.filters.some(([k]) => k === "limit:1")) return { data: state.lastMessage };
    if (table === "buddy_messages" && c.op === "select") return { data: [...state.history].reverse() };
    return { data: null, error: null };
  };
  const chain: Record<string, unknown> = {
    select: () => chain,
    insert: (v: unknown) => ((c.op = "insert"), (c.values = v), chain),
    update: (v: unknown) => ((c.op = "update"), (c.values = v), chain),
    eq: (k: string, v: unknown) => (c.filters.push([k, v]), chain),
    order: () => chain,
    limit: (n: number) => (c.filters.push([`limit:${n}`, n]), chain),
    maybeSingle: async () => result(),
    single: async () => result(),
    then: (ok: (v: unknown) => void) => ok(result()),
  };
  return chain;
}
const db = {
  auth: { getUser: async () => ({ data: { user: state.user }, error: state.user ? null : new Error("x") }) },
  from: (t: string) => query(t),
  rpc: async (name: string) => {
    calls.push({ table: `rpc:${name}`, op: "rpc", filters: [] });
    if (name === "buddy_take_turn") return { data: state.used, error: null };
    return { data: null, error: null };
  },
};
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: db }));

// ---- A fake AI that streams a fixed answer and remembers what it was sent. ----
const ai = { reply: ["Hé, ", "vertel!\nKEUZES: Ja | Nee"], lastSystem: "", lastMessages: [] as unknown[], moderation: null as unknown };
vi.mock("ai", () => ({
  streamText: (opts: { system: string; messages: unknown[] }) => {
    ai.lastSystem = opts.system;
    ai.lastMessages = opts.messages;
    return {
      textStream: (async function* () {
        for (const part of ai.reply) yield part;
      })(),
    };
  },
}));
vi.mock("@/server/buddy/model.server", () => ({
  buddyModel: () => ({ model: {}, providerOptions: {} }),
  aiSafetyCheck: async () => ai.moderation,
  THINKING_ROOM: 1500,
}));

const { Route } = await import("./buddy");
const POST = (Route.options as unknown as { server: { handlers: { POST: (a: { request: Request }) => Promise<Response> } } }).server.handlers.POST;
const ask = (body: unknown, token: string | null = "t") =>
  POST({
    request: new Request("http://x/api/buddy", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    }),
  });

beforeEach(() => {
  calls.length = 0;
  Object.assign(state, { user: { id: "u1" }, accepted: true, conversationOwner: "u1", used: 1, lastMessage: null, birthdate: "2010-01-01" });
  state.settings = { enabled: true, model: "gpt-5-mini", daily_limit: 3, context_messages: 6, max_reply_tokens: 500, extra_instructions: "" };
  ai.reply = ["Hé, ", "vertel!\nKEUZES: Ja | Nee"];
  ai.moderation = null;
});

const inserts = (table: string) => calls.filter((c) => c.table === table && c.op === "insert").map((c) => c.values as Record<string, unknown>);

describe("POST /api/buddy", () => {
  it("refuses without login", async () => {
    expect((await ask({ message: "hoi" }, null)).status).toBe(401);
    state.user = null;
    expect((await ask({ message: "hoi" })).status).toBe(401);
  });

  it("refuses empty and too long messages", async () => {
    expect((await ask({ message: "   " })).status).toBe(400);
    expect((await ask({ message: "x".repeat(2001) })).status).toBe(400);
  });

  it("asks to read the explanation first", async () => {
    state.accepted = false;
    const res = await ask({ message: "hoi" });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("consent");
  });

  it("respects the on/off switch and the daily limit", async () => {
    state.settings = { ...state.settings!, enabled: false };
    expect((await ask({ message: "hoi" })).status).toBe(503);
    state.settings = { ...state.settings!, enabled: true };
    state.used = 4;
    const res = await ask({ message: "hoi" });
    expect(res.status).toBe(429);
    expect((await res.json()).code).toBe("limit");
  });

  it("never opens someone else's conversation", async () => {
    state.conversationOwner = "someone-else";
    expect((await ask({ conversationId: "c1", message: "hoi" })).status).toBe(404);
  });

  it("ignores the same message twice in a row", async () => {
    state.lastMessage = { role: "user", content: "hoi", created_at: new Date().toISOString() };
    expect((await ask({ conversationId: "c1", message: "hoi" })).status).toBe(409);
  });

  it("streams the answer and saves both messages in a new conversation", async () => {
    const res = await ask({ message: "Ik had een rotdag", mode: "verhaal" });
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Buddy-Conversation")).toBe("c-new");
    expect(res.headers.get("X-Buddy-Safety")).toBe("none");
    expect(await res.text()).toBe("Hé, vertel!\nKEUZES: Ja | Nee");
    expect(inserts("buddy_conversations")[0]).toMatchObject({ user_id: "u1", title: "Even mijn verhaal kwijt" });
    const msgs = inserts("buddy_messages");
    expect(msgs[0]).toMatchObject({ role: "user", content: "Ik had een rotdag", safety: false, conversation_id: "c-new" });
    expect(msgs[1]).toMatchObject({ role: "assistant", content: "Hé, vertel!\nKEUZES: Ja | Nee", safety: false });
    expect(calls.some((c) => c.table === "rpc:buddy_cleanup")).toBe(true);
  });

  it("sends only the age bracket and recent turns, never the birthdate", async () => {
    await (await ask({ message: "hoi" })).text();
    expect(ai.lastSystem).toContain("tussen 16 en 18 jaar");
    expect(ai.lastSystem).not.toContain("2010");
    expect(ai.lastSystem).toContain("VEILIGHEID");
    expect(JSON.stringify(ai.lastMessages)).not.toContain("2010");
  });

  it("switches to the safety protocol on serious signals", async () => {
    const res = await ask({ message: "ik wil er niet meer zijn" });
    expect(res.headers.get("X-Buddy-Safety")).toBe("zorg");
    await res.text();
    expect(ai.lastSystem).toContain("veiligheidsprotocol");
    expect(inserts("buddy_messages")[0]).toMatchObject({ safety: true });
  });

  it("also uses the separate AI safety check, not only words", async () => {
    ai.moderation = "acuut";
    const res = await ask({ message: "morgen ben ik er gewoon niet meer, klaar" });
    expect(res.headers.get("X-Buddy-Safety")).toBe("acuut");
    await res.text();
    expect(ai.lastSystem).toContain("112");
  });

  it("marks an answer as safety-related when the AI itself noticed it", async () => {
    ai.reply = ["[[veilig]]Fijn dat je het vertelt."];
    await (await ask({ message: "het gaat niet zo goed thuis" })).text();
    expect(inserts("buddy_messages")[1]).toMatchObject({ role: "assistant", safety: true });
  });

  it("tells the app when the AI failed, without saving an empty answer", async () => {
    ai.reply = [];
    const text = await (await ask({ message: "hoi" })).text();
    expect(text).toContain("[[fout]]");
    expect(inserts("buddy_messages")).toHaveLength(1);
  });

  it("answers a retry without saving the message again", async () => {
    state.lastMessage = { role: "user", content: "hoi", created_at: new Date().toISOString() };
    const res = await ask({ conversationId: "c1", message: "hoi", retry: true });
    expect(res.status).toBe(200);
    await res.text();
    expect(inserts("buddy_messages").map((m) => m["role"])).toEqual(["assistant"]);
  });
});
