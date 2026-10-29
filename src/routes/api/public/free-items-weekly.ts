import { createFileRoute } from "@tanstack/react-router";
import { pushToUser } from "@/lib/push.functions";

// Weekly call from the database scheduler: announces free Game Clicks to everyone with push on.
export const Route = createFileRoute("/api/public/free-items-weekly")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const given = request.headers.get("x-cron-token") ?? "";
        const { data: tok } = await supabaseAdmin.from("cron_tokens").select("token").eq("name", "free_items_weekly").maybeSingle();
        if (!tok || given.length !== tok.token.length || given !== tok.token) return new Response("Unauthorized", { status: 401 });
        const { data: free } = await supabaseAdmin.rpc("free_items_available");
        const n = free ?? 0;
        if (n < 1) return Response.json({ sent: 0 });
        const { data: rows } = await supabaseAdmin.from("push_tokens").select("user_id");
        const users = [...new Set((rows ?? []).map((r) => r.user_id))];
        const msg = { title: "🎁 Gratis Game Clicks!", body: `Er ${n === 1 ? "staat" : "staan"} ${n} gratis Game Clicks klaar in de CeritaShop. Op = op!`, link: "/shop", tag: `free-${Date.now()}` };
        let sent = 0;
        for (const u of users) sent += await pushToUser(u, msg);
        await supabaseAdmin.from("activity_log").insert({ actor_id: null, action: "announcement", target_table: "push_tokens", details: { title: msg.title, body: msg.body, sent } });
        return Response.json({ sent });
      },
    },
  },
});
