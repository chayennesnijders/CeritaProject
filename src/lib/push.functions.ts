import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// The public Firebase web settings, read at runtime (they are not secret), plus the names of any
// that are missing or look wrong. Lets push work without depending on a rebuild in Vercel.
export const getFirebaseWebConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { resolveFirebaseConfig } = await import("@/lib/firebase-config");
  return resolveFirebaseConfig(process.env);
});

type Push = { title: string; body: string; link: string; tag: string; urgent?: boolean };

// Sends one push to every registered device of a user. Removes stale tokens.
// Skipped during the member's quiet hours, unless it is urgent (care signals for admins).
export async function pushToUser(userId: string, msg: Push) {
  const { fcmServiceAccount, sendFcm } = await import("@/lib/fcm.server");
  const sa = fcmServiceAccount();
  if (!sa) return 0;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (!msg.urgent) {
    const { data: prefs } = await supabaseAdmin
      .from("profiles")
      .select("quiet_start, quiet_end")
      .eq("id", userId)
      .maybeSingle();
    const { dutchHourNow, inQuietHours } = await import("@/lib/quiet-hours");
    if (inQuietHours(dutchHourNow(), prefs?.quiet_start, prefs?.quiet_end)) return 0;
  }
  const { data: tokens } = await supabaseAdmin
    .from("push_tokens")
    .select("token")
    .eq("user_id", userId);
  let sent = 0;
  for (const { token } of tokens ?? []) {
    const res = await sendFcm(sa, {
      token,
      notification: { title: msg.title, body: msg.body },
      data: { link: msg.link },
      webpush: {
        notification: { tag: msg.tag, renotify: true, icon: "/apple-touch-icon.png" },
        fcm_options: { link: msg.link },
      },
    });
    if (res.ok) sent++;
    else {
      const body = await res.text();
      console.error(`FCM send failed [${res.status}]: ${body}`);
      if (res.status === 404 || res.status === 400)
        await supabaseAdmin.from("push_tokens").delete().eq("token", token);
    }
  }
  return sent;
}

async function senderName(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();
  return data?.display_name ?? "Iemand";
}

// Push to the recipient of a chat request. Only the requester of a pending request may trigger it.
export const notifyChatRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ convId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: conv } = await context.supabase
      .from("conversations")
      .select("id, user_a, user_b, requested_by, status")
      .eq("id", data.convId)
      .maybeSingle();
    if (!conv || conv.requested_by !== context.userId || conv.status !== "pending")
      return { sent: 0 };
    const recipient = conv.user_a === context.userId ? conv.user_b : conv.user_a;
    const name = await senderName(context.userId);
    const sent = await pushToUser(recipient, {
      title: "Nieuw chatverzoek",
      body: `${name} wil met je chatten.`,
      link: "/berichten",
      tag: `req-${conv.id}`,
    });
    return { sent };
  });

// Push to the other party when a new private message is sent. Only the sender of that message may trigger it.
export const notifyNewMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ messageId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: msg } = await context.supabase
      .from("direct_messages")
      .select("id, body, sender_id, conversation_id")
      .eq("id", data.messageId)
      .maybeSingle();
    if (!msg || msg.sender_id !== context.userId) return { sent: 0 };
    const { data: conv } = await context.supabase
      .from("conversations")
      .select("user_a, user_b")
      .eq("id", msg.conversation_id)
      .maybeSingle();
    if (!conv) return { sent: 0 };
    const recipient = conv.user_a === context.userId ? conv.user_b : conv.user_a;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pref } = await supabaseAdmin
      .from("conversation_prefs")
      .select("muted")
      .eq("user_id", recipient)
      .eq("conversation_id", msg.conversation_id)
      .maybeSingle();
    if (pref?.muted) return { sent: 0 };
    const name = await senderName(context.userId);
    const preview = msg.body.length > 120 ? `${msg.body.slice(0, 117)}...` : msg.body;
    const sent = await pushToUser(recipient, {
      title: name,
      body: preview,
      link: `/berichten/${msg.conversation_id}`,
      tag: `conv-${msg.conversation_id}`,
    });
    return { sent };
  });

// Admin-only: sends an announcement push to every registered device and logs it.
export const sendAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ title: z.string().trim().min(1).max(60), body: z.string().trim().min(1).max(200) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Alleen beheerders kunnen aankondigingen sturen.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin.from("push_tokens").select("user_id");
    const users = [...new Set((rows ?? []).map((r) => r.user_id))];
    const tag = `ann-${Date.now()}`;
    let sent = 0;
    for (const u of users)
      sent += await pushToUser(u, { title: data.title, body: data.body, link: "/home", tag });
    await supabaseAdmin.from("activity_log").insert({
      actor_id: context.userId,
      action: "announcement",
      target_table: "push_tokens",
      details: { title: data.title, body: data.body, sent },
    });
    return { sent, users: users.length };
  });

// Push to the other party when someone starts a (video)call. Only allowed when the caller may call in this chat.
export const notifyCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ convId: z.string().uuid(), video: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: ok } = await context.supabase.rpc("can_call", { _conv: data.convId });
    if (!ok) return { sent: 0 };
    const { data: conv } = await context.supabase
      .from("conversations")
      .select("user_a, user_b")
      .eq("id", data.convId)
      .maybeSingle();
    if (!conv) return { sent: 0 };
    const recipient = conv.user_a === context.userId ? conv.user_b : conv.user_a;
    const name = await senderName(context.userId);
    const sent = await pushToUser(recipient, {
      title: data.video ? "📹 Inkomend videogesprek" : "📞 Inkomend gesprek",
      body: `${name} belt je. Tik om op te nemen.`,
      link: `/berichten/${data.convId}`,
      tag: `call-${data.convId}`,
    });
    return { sent };
  });

// Admin-only: push to the buyer when an order is shipped or gets a tracking code.
export const notifyOrderUpdate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isOwner } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "owner",
    });
    if (!isOwner) throw new Error("Alleen de eigenaar.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("shop_orders")
      .select("user_id, status, tracking_code")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order || order.status !== "verzonden") return { sent: 0 };
    const sent = await pushToUser(order.user_id, {
      title: "📦 Je bestelling is onderweg!",
      body: order.tracking_code
        ? `Track&trace: ${order.tracking_code}`
        : "Je Game Clicks is verzonden.",
      link: "/shop",
      tag: `order-${data.orderId}`,
    });
    return { sent };
  });

// Admin-only: push to everyone when a new story is published.
export const notifyNewArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ title: z.string().trim().min(1).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Alleen beheerders.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin.from("push_tokens").select("user_id");
    const users = [...new Set((rows ?? []).map((r) => r.user_id))];
    let sent = 0;
    for (const u of users)
      sent += await pushToUser(u, {
        title: "📖 Nieuw verhaal",
        body: data.title,
        link: "/ontdekken",
        tag: `art-${Date.now()}`,
      });
    return { sent, users: users.length };
  });

// Push to the author of a group post when someone replies directly to it (skips self-replies and muted groups).
export const notifyGroupReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ postId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: post } = await context.supabase
      .from("posts")
      .select("id, body, author_id, group_id, reply_to")
      .eq("id", data.postId)
      .maybeSingle();
    if (!post || post.author_id !== context.userId || !post.reply_to) return { sent: 0 };
    const { data: parent } = await context.supabase
      .from("posts")
      .select("author_id")
      .eq("id", post.reply_to)
      .maybeSingle();
    if (!parent || parent.author_id === context.userId) return { sent: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pref } = await supabaseAdmin
      .from("group_prefs")
      .select("muted")
      .eq("user_id", parent.author_id)
      .eq("group_id", post.group_id)
      .maybeSingle();
    if (pref?.muted) return { sent: 0 };
    const { data: g } = await supabaseAdmin
      .from("groups")
      .select("name")
      .eq("id", post.group_id)
      .maybeSingle();
    const name = await senderName(context.userId);
    const preview = post.body.length > 120 ? `${post.body.slice(0, 117)}...` : post.body;
    const sent = await pushToUser(parent.author_id, {
      title: `↩️ ${name} reageerde op jou${g?.name ? ` in ${g.name}` : ""}`,
      body: preview,
      link: `/community/${post.group_id}`,
      tag: `reply-${post.id}`,
    });
    return { sent };
  });

// Push to group members mentioned with @username in a post. Only the author of that post may trigger it.
export const notifyGroupMention = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ postId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: post } = await context.supabase
      .from("posts")
      .select("id, body, author_id, group_id, mentions")
      .eq("id", data.postId)
      .maybeSingle();
    if (!post || post.author_id !== context.userId) return { sent: 0 };
    const targets = (post.mentions ?? []).filter((u) => u !== context.userId);
    if (targets.length === 0) return { sent: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: prefs }, { data: g }] = await Promise.all([
      supabaseAdmin
        .from("group_prefs")
        .select("user_id, muted")
        .eq("group_id", post.group_id)
        .in("user_id", targets),
      supabaseAdmin.from("groups").select("name").eq("id", post.group_id).maybeSingle(),
    ]);
    const muted = new Set((prefs ?? []).filter((p) => p.muted).map((p) => p.user_id));
    const name = await senderName(context.userId);
    const preview = post.body.length > 120 ? `${post.body.slice(0, 117)}...` : post.body;
    let sent = 0;
    for (const u of targets) {
      if (muted.has(u)) continue;
      sent += await pushToUser(u, {
        title: `@ ${name} noemde jou${g?.name ? ` in ${g.name}` : ""}`,
        body: preview,
        link: `/community/${post.group_id}`,
        tag: `mention-${post.id}`,
      });
    }
    return { sent };
  });

// Push to the invited person when a group member invites them. Only the inviter may trigger it.
export const notifyGroupInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ inviteId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: inv } = await context.supabase
      .from("group_invites")
      .select("id, group_id, inviter_id, invitee_id, status")
      .eq("id", data.inviteId)
      .maybeSingle();
    if (!inv || inv.inviter_id !== context.userId || inv.status !== "pending") return { sent: 0 };
    const name = await senderName(context.userId);
    const { data: g } = await context.supabase
      .from("groups")
      .select("name, emoji")
      .eq("id", inv.group_id)
      .maybeSingle();
    const sent = await pushToUser(inv.invitee_id, {
      title: `👋 ${name} nodigt je uit`,
      body: `Kom je in de groep ${g?.emoji ?? ""} ${g?.name ?? ""}?`.trim(),
      link: "/community",
      tag: `ginv-${inv.id}`,
    });
    return { sent };
  });

// Admin-only: turn push for Nieuws on or off for yourself; turning it on also schedules the 5-minute check
// on this app's own address.
export const setAdminNewsPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ on: z.boolean(), origin: z.string().url().startsWith("https://") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Alleen voor beheerders.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("admin_news_seen")
      .upsert({ user_id: context.userId, push: data.on }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    if (data.on) {
      const { error: cronError } = await supabaseAdmin.rpc("schedule_admin_news_push", {
        site_url: data.origin,
      });
      if (cronError) throw new Error(cronError.message);
    }
    return { on: data.on };
  });

// Admin-only: answer a member's message (or mark it as read). The member gets a push when answered.
export const answerAdminMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), reply: z.string().trim().max(2000).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("answer_admin_message", {
      _message: data.id,
      _reply: data.reply ?? "",
    });
    if (error) throw new Error(error.message);
    if (data.reply) {
      const { data: msg } = await context.supabase
        .from("admin_messages")
        .select("user_id")
        .eq("id", data.id)
        .maybeSingle();
      if (msg)
        await pushToUser(msg.user_id, {
          title: "💌 Antwoord van de beheerders",
          body: "Je hebt een antwoord op je bericht.",
          link: "/contact",
          tag: `antwoord-${data.id}`,
        });
    }
    return { ok: true };
  });

// Owner only: tell the member that their return moved on (address mailed, package received, refused).
export const notifyReturnUpdate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ returnId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isOwner } = await context.supabase.rpc("is_owner", { _user_id: context.userId });
    if (!isOwner) return { sent: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ret } = await supabaseAdmin
      .from("shop_returns")
      .select("user_id, status")
      .eq("id", data.returnId)
      .maybeSingle();
    if (!ret) return { sent: 0 };
    const { returnStatus } = await import("@/lib/returns");
    const sent = await pushToUser(ret.user_id, {
      title: `📦 Je retour: ${returnStatus(ret.status).label.toLowerCase()}`,
      body: returnStatus(ret.status).member,
      link: "/shop",
      tag: `retour-${data.returnId}`,
    });
    return { sent };
  });

// Push to the other player of a chat game after a move: "jouw beurt" or the result. Only a player may trigger it.
export const notifyGameMove = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ gameId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: game } = await context.supabase
      .from("chat_games")
      .select("id, game, group_id, conversation_id, players, turn, status, winner")
      .eq("id", data.gameId)
      .maybeSingle();
    if (!game || !game.players.includes(context.userId)) return { sent: 0 };
    const recipient = game.players.find((p) => p !== context.userId);
    if (!recipient || (game.status !== "klaar" && game.turn !== recipient)) return { sent: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pref } = game.group_id
      ? await supabaseAdmin
          .from("group_prefs")
          .select("muted")
          .eq("user_id", recipient)
          .eq("group_id", game.group_id)
          .maybeSingle()
      : await supabaseAdmin
          .from("conversation_prefs")
          .select("muted")
          .eq("user_id", recipient)
          .eq("conversation_id", game.conversation_id!)
          .maybeSingle();
    if (pref?.muted) return { sent: 0 };
    const { gamePushText } = await import("@/lib/chat-games");
    const text = gamePushText(game.game, {
      name: await senderName(context.userId),
      status: game.status,
      youWon: game.winner === recipient,
      draw: game.status === "klaar" && !game.winner,
    });
    const sent = await pushToUser(recipient, {
      ...text,
      link: game.group_id
        ? `/community/${game.group_id}?spel=${game.id}`
        : `/berichten/${game.conversation_id}?spel=${game.id}`,
      tag: `game-${game.id}`,
    });
    return { sent };
  });

// Push to someone who just got a compliment. Does not say who sent it; only the sender may trigger it, within a minute.
export const notifyCompliment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ to: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sent } = await supabaseAdmin
      .from("compliments")
      .select("id")
      .eq("from_id", context.userId)
      .eq("to_id", data.to)
      .gt("created_at", new Date(Date.now() - 60_000).toISOString())
      .limit(1);
    if (!sent?.length) return { sent: 0 };
    const pushed = await pushToUser(data.to, {
      title: "💐 Je kreeg een compliment!",
      body: "Iemand vindt jou echt leuk. Kijk op je complimentenmuur.",
      link: "/complimenten",
      tag: "compliment",
    });
    return { sent: pushed };
  });

// Admin only: what is set up for going live. Only yes/no and counts, never the keys themselves.
export const getLaunchChecks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Alleen voor beheerders.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { fcmServiceAccount } = await import("@/lib/fcm.server");
    const env = (k: string) => !!process.env[k]?.trim();
    const exists = async (table: string, column = "*") => {
      const { error } = await supabaseAdmin
        .from(table as "groups")
        .select(column)
        .limit(1);
      return !error;
    };
    const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
    const [chat, groupsBy, compliments, playlists, books, questions] = await Promise.all([
      exists("chat_games"),
      exists("groups", "created_by"),
      exists("compliments"),
      exists("playlists"),
      exists("books"),
      exists("anon_questions"),
    ]);
    let fcm = false;
    try {
      fcm = !!fcmServiceAccount();
    } catch {
      fcm = false;
    }
    return {
      serviceRole: env("SUPABASE_SERVICE_ROLE_KEY"),
      firebaseServer: fcm,
      firebaseClient: (await import("@/lib/firebase-config")).resolveFirebaseConfig(process.env).config !== null,
      resend: env("RESEND_API_KEY") && env("EMAIL_FROM"),
      emailHook: env("SEND_EMAIL_HOOK_SECRET"),
      stripeLive: (process.env["STRIPE_SECRET_KEY"] ?? "").startsWith("sk_live_"),
      openai: env("OPENAI_API_KEY"),
      updates: {
        "18-21": chat && groupsBy,
        "22": compliments,
        "23-24": playlists && !books,
        "25": questions,
      },
      playlists: playlists
        ? await count(supabaseAdmin.from("playlists").select("id", { count: "exact", head: true }))
        : 0,
      articles: await count(
        supabaseAdmin.from("articles").select("id", { count: "exact", head: true }),
      ),
      upcomingEvents: questions
        ? await count(
            supabaseAdmin
              .from("events")
              .select("id", { count: "exact", head: true })
              .gt("starts_at", new Date().toISOString()),
          )
        : 0,
    };
  });
