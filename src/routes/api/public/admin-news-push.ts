import { createFileRoute } from "@tanstack/react-router";
import { pushToUser } from "@/lib/push.functions";
import { adminPushMessage } from "@/lib/admin-news";

// Called every 5 minutes by the database scheduler: pushes new members, orders, stories, reports, messages and care signals
// to the admins who turned on push in Beheer → Nieuws.
export const Route = createFileRoute("/api/public/admin-news-push")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const given = request.headers.get("x-cron-token") ?? "";
        const { data: tok } = await supabaseAdmin
          .from("cron_tokens")
          .select("token")
          .eq("name", "admin_news_push")
          .maybeSingle();
        if (!tok || given.length !== tok.token.length || given !== tok.token)
          return new Response("Unauthorized", { status: 401 });

        const { data: state } = await supabaseAdmin
          .from("admin_push_state")
          .select("last_run")
          .eq("id", 1)
          .maybeSingle();
        const since = state?.last_run ?? new Date(Date.now() - 5 * 60_000).toISOString();
        const until = new Date().toISOString();
        await supabaseAdmin.from("admin_push_state").upsert({ id: 1, last_run: until });

        const [members, orders, stories, reports, messages, care, contact, returns] =
          await Promise.all([
            supabaseAdmin
              .from("profiles")
              .select("display_name")
              .gt("created_at", since)
              .lte("created_at", until),
            supabaseAdmin
              .from("shop_orders")
              .select("product, ship_name")
              .gt("created_at", since)
              .lte("created_at", until),
            supabaseAdmin
              .from("story_submissions")
              .select("title")
              .gt("created_at", since)
              .lte("created_at", until),
            supabaseAdmin
              .from("reports")
              .select("reason")
              .gt("created_at", since)
              .lte("created_at", until),
            supabaseAdmin
              .from("admin_messages")
              .select("body")
              .gt("created_at", since)
              .lte("created_at", until),
            supabaseAdmin
              .from("safety_alerts")
              .select("id")
              .gt("created_at", since)
              .lte("created_at", until),
            supabaseAdmin
              .from("public_messages")
              .select("name")
              .gt("created_at", since)
              .lte("created_at", until),
            supabaseAdmin
              .from("shop_returns")
              .select("id")
              .gt("created_at", since)
              .lte("created_at", until),
          ]);
        const items = [
          ...(members.data ?? []).map((m) => ({ kind: "aanmelding", title: m.display_name })),
          ...(orders.data ?? []).map((o) => ({
            kind: "bestelling",
            title: `${o.ship_name} bestelde iets`,
          })),
          ...(stories.data ?? []).map((s) => ({ kind: "verhaal", title: s.title })),
          ...(reports.data ?? []).map((r) => ({ kind: "melding", title: r.reason.slice(0, 100) })),
          ...(messages.data ?? []).map((m) => ({ kind: "bericht", title: m.body.slice(0, 100) })),
          // No text of care signals in a push: it can show up on a locked screen.
          ...(care.data ?? []).map(() => ({ kind: "zorg", title: "Zorgsignaal" })),
          ...(contact.data ?? []).map((c) => ({ kind: "contact", title: `Vraag van ${c.name}` })),
          ...(returns.data ?? []).map(() => ({
            kind: "retour",
            title: "Iemand wil iets terugsturen",
          })),
        ];
        if (items.length === 0) return Response.json({ sent: 0 });

        const [{ data: wanted }, { data: roles }] = await Promise.all([
          supabaseAdmin.from("admin_news_seen").select("user_id").eq("push", true),
          supabaseAdmin.from("user_roles").select("user_id, role").in("role", ["admin", "owner"]),
        ]);
        const admins = new Set(
          (roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id),
        );
        const owners = new Set(
          (roles ?? []).filter((r) => r.role === "owner").map((r) => r.user_id),
        );
        let sent = 0;
        for (const { user_id } of wanted ?? []) {
          if (!admins.has(user_id)) continue;
          const msg = adminPushMessage(items, owners.has(user_id));
          if (msg)
            sent += await pushToUser(user_id, { ...msg, link: "/beheer", tag: `nieuws-${until}` });
        }
        return Response.json({ sent });
      },
    },
  },
});
