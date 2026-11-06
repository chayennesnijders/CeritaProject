import { createFileRoute } from "@tanstack/react-router";
import { streamText } from "ai";
import {
  ageBracket,
  assessSafety,
  BUDDY_MAX_MESSAGE,
  buddyMode,
  buildContext,
  parseReply,
  titleFrom,
  type BuddyTurn,
} from "@/lib/ceritabuddy";
import { buddySystemPrompt } from "@/server/buddy/prompt";
import { aiSafetyCheck, buddyModel, THINKING_ROOM } from "@/server/buddy/model.server";

// POST /api/buddy — één beurt in een CeritaBuddy-gesprek.
// Volgorde: inloggen controleren → uitleg gelezen? → aan/uit en daglimiet → veiligheidscheck →
// bericht opslaan → alleen de laatste beurten naar het AI-model → antwoord streamen → antwoord opslaan.
// Alles met rechten gebeurt hier op de server; de app kan zelf geen berichten wegschrijven.
const json = (body: unknown, status: number) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export const Route = createFileRoute("/api/buddy")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("Authorization");
        const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
        if (!token) return json({ error: "Je bent niet ingelogd." }, 401);

        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const { data: userData, error: userErr } = await db.auth.getUser(token);
        const user = userData?.user;
        if (userErr || !user) return json({ error: "Je bent niet ingelogd." }, 401);

        let body: { conversationId?: unknown; message?: unknown; mode?: unknown; retry?: unknown };
        try {
          body = await request.json();
        } catch {
          return json({ error: "Dat bericht kon ik niet lezen." }, 400);
        }
        const message = typeof body.message === "string" ? body.message.trim() : "";
        const mode = typeof body.mode === "string" && buddyMode(body.mode) ? body.mode : null;
        let conversationId = typeof body.conversationId === "string" ? body.conversationId : null;
        // "Probeer opnieuw" after a failed answer: the message is already saved, only answer it.
        let retry = body.retry === true;
        if (!message) return json({ error: "Je bericht is leeg." }, 400);
        if (message.length > BUDDY_MAX_MESSAGE)
          return json({ error: `Je bericht is te lang (max. ${BUDDY_MAX_MESSAGE} tekens). Splits het gerust op.` }, 400);

        const [{ data: settings }, { data: prefs }, { data: profile }] = await Promise.all([
          db.from("buddy_settings").select("*").eq("id", 1).maybeSingle(),
          db.from("buddy_prefs").select("accepted_at").eq("user_id", user.id).maybeSingle(),
          db.from("profiles").select("birthdate, is_parent").eq("id", user.id).maybeSingle(),
        ]);
        if (profile?.is_parent) return json({ error: "CeritaBuddy is er voor jongeren." }, 403);
        if (!settings?.enabled) return json({ error: "CeritaBuddy staat even uit. Probeer het later nog eens." }, 503);
        if (!prefs?.accepted_at) return json({ error: "Lees eerst de uitleg over CeritaBuddy.", code: "consent" }, 403);

        // The separate AI safety check starts now, so it runs while the checks below are done.
        const aiCheck = aiSafetyCheck(message);

        // Conversation: must be yours. A new one is made on the first message.
        if (conversationId) {
          const { data: conv } = await db
            .from("buddy_conversations")
            .select("id, user_id")
            .eq("id", conversationId)
            .maybeSingle();
          if (!conv || conv.user_id !== user.id) return json({ error: "Dit gesprek bestaat niet (meer)." }, 404);
          // The same message twice in a few seconds (double tap, flaky connection): ignore the second.
          const { data: last } = await db
            .from("buddy_messages")
            .select("role, content, created_at")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          const sameAsLast = last?.role === "user" && last.content === message;
          if (retry && !sameAsLast) retry = false;
          if (!retry && sameAsLast && Date.now() - new Date(last!.created_at).getTime() < 15_000)
            return json({ error: "Dit bericht is al verstuurd.", code: "duplicate" }, 409);
        }

        // Daily limit (counted atomically in the database).
        const { data: used, error: turnErr } = await db.rpc("buddy_take_turn", { _user: user.id });
        if (turnErr) return json({ error: "Er ging iets mis. Probeer het zo nog eens." }, 500);
        const remaining = Math.max(0, settings.daily_limit - (used ?? 0));
        if ((used ?? 0) > settings.daily_limit)
          return json({ error: "Je berichten voor vandaag zijn op. Om 00:00 kun je weer verder met CeritaBuddy.", code: "limit" }, 429);

        // Safety layer: word patterns + a separate AI check (the model's own [[veilig]] mark comes after).
        const safety = assessSafety(message, await aiCheck);

        if (!conversationId) {
          const { data: conv, error } = await db
            .from("buddy_conversations")
            .insert({ user_id: user.id, title: mode ? buddyMode(mode)!.label : titleFrom(message) })
            .select("id")
            .single();
          if (error || !conv) return json({ error: "Een nieuw gesprek starten lukte niet." }, 500);
          conversationId = conv.id;
        }
        const convId = conversationId;
        if (!retry) {
          const { error: insErr } = await db
            .from("buddy_messages")
            .insert({ conversation_id: convId, user_id: user.id, role: "user", content: message, safety: safety !== "none" });
          if (insErr) return json({ error: "Je bericht opslaan lukte niet." }, 500);
        }

        // Only the newest turns go to the model; never names, birthdates or other profile data.
        const { data: rows } = await db
          .from("buddy_messages")
          .select("role, content")
          .eq("conversation_id", convId)
          .order("created_at", { ascending: false })
          .limit(settings.context_messages);
        const history = buildContext(((rows ?? []).reverse() as BuddyTurn[]), settings.context_messages);

        let ai;
        try {
          ai = buddyModel(settings.model);
        } catch (e) {
          return json({ error: e instanceof Error ? e.message : "AI is niet ingesteld." }, 500);
        }
        const system = buddySystemPrompt({
          bracket: ageBracket(profile?.birthdate),
          mode,
          safety,
          extra: settings.extra_instructions,
          remaining,
        });

        let failure: unknown = null;
        const result = streamText({
          model: ai.model,
          system,
          messages: history,
          // The visible answer is kept short by the instruction; the extra room is for Claude's thinking.
          maxOutputTokens: settings.max_reply_tokens + THINKING_ROOM,
          providerOptions: ai.providerOptions,
          onError: ({ error }) => {
            failure = error;
          },
        });

        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            let text = "";
            try {
              for await (const chunk of result.textStream) {
                text += chunk;
                controller.enqueue(encoder.encode(chunk));
              }
            } catch (e) {
              failure = failure ?? e;
            }
            if (failure || !text.trim()) {
              const status = (failure as { statusCode?: number } | null)?.statusCode;
              console.error("CeritaBuddy antwoord mislukt", status ?? "", failure);
              controller.enqueue(encoder.encode("\n[[fout]]"));
            } else {
              const parsed = parseReply(text);
              await db.from("buddy_messages").insert({
                conversation_id: convId,
                user_id: user.id,
                role: "assistant",
                content: text.slice(0, 12000),
                safety: parsed.safety || safety !== "none",
              });
            }
            await db.from("buddy_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
            // Retention: conversations without activity for 90 days are removed.
            await db.rpc("buddy_cleanup", { _user: user.id });
            controller.close();
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Buddy-Conversation": convId,
            "X-Buddy-Safety": safety,
            "X-Buddy-Remaining": String(remaining),
            "Access-Control-Expose-Headers": "X-Buddy-Conversation, X-Buddy-Safety, X-Buddy-Remaining",
          },
        });
      },
    },
  },
});
