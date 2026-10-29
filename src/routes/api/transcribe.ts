import { createFileRoute } from "@tanstack/react-router";

// POST /api/transcribe — zet een audio-opname om naar tekst (Nederlands).
// Alleen voor ingelogde leden: de bearer-token wordt eerst gecontroleerd.
export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("Authorization");
        const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
        if (!token) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
        if (userErr || !userData.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return Response.json({ error: "Spraakherkenning is niet ingesteld" }, { status: 500 });

        const contentLength = Number(request.headers.get("Content-Length") ?? 0);
        if (contentLength > 24 * 1024 * 1024) return Response.json({ error: "Opname is te groot" }, { status: 413 });

        let file: File | null = null;
        try {
          const form = await request.formData();
          const f = form.get("file");
          if (f instanceof File && f.size > 0) file = f;
        } catch {
          return Response.json({ error: "Ongeldige opname" }, { status: 400 });
        }
        if (!file) return Response.json({ error: "Geen audio meegegeven" }, { status: 400 });
        if (file.size > 20 * 1024 * 1024) return Response.json({ error: "Opname is te groot" }, { status: 413 });

        const form = new FormData();
        form.append("model", "openai/gpt-transcribe");
        form.append("file", file, file.name);
        form.append("response_format", "json");
        form.append("stream", "true");
        form.append("language", "nl");
        // Helpt het model ook bij hele korte opnames ("hoi", "ja") Nederlands te verstaan.
        form.append("prompt", "Een korte Nederlandse dagboekopname van een jongere, bijvoorbeeld: hoi, ja, goedemorgen.");

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: form,
        });
        if (!upstream.ok || !upstream.body) {
          const body = await upstream.text();
          console.error(`Transcribe failed [${upstream.status}]: ${body}`);
          return Response.json({ error: "Omzetten mislukt", detail: body }, { status: upstream.status });
        }

        // SSE-stream uitlezen en de volledige tekst als JSON teruggeven.
        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let text = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          for (const evt of events) {
            const dataLine = evt.split("\n").find((l) => l.startsWith("data:"));
            if (!dataLine) continue;
            const payload = dataLine.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const parsed = JSON.parse(payload) as { type?: string; delta?: string; text?: string };
              if (parsed.type === "transcript.text.delta" && parsed.delta) text += parsed.delta;
              if (parsed.type === "transcript.text.done" && parsed.text) text = parsed.text;
            } catch {
              // onvolledig event overslaan
            }
          }
        }
        return Response.json({ text });
      },
    },
  },
});
