import { createFileRoute } from "@tanstack/react-router";
import { pushToUser } from "@/lib/push.functions";
import { eventTime, minutesUntil } from "@/lib/events";
import { reminderPush, shouldRemind } from "@/lib/daily-reminder";
import { dutchHourNow } from "@/lib/quiet-hours";
import { shiftDay, streakDays } from "@/lib/streak";

// Called every 15 minutes by the database scheduler: tells members when a letter to themselves may be
// opened, reminds them of a meetup they signed up for in the hour before it starts, tells coaches
// about new questions, and sends the opt-in daily reminder for your pet.
export const Route = createFileRoute("/api/public/member-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const given = request.headers.get("x-cron-token") ?? "";
        const { data: tok } = await supabaseAdmin
          .from("cron_tokens")
          .select("token")
          .eq("name", "member_reminders")
          .maybeSingle();
        if (!tok || given.length !== tok.token.length || given !== tok.token)
          return new Response("Unauthorized", { status: 401 });

        let sent = 0;
        const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(
          new Date(),
        );
        const { data: letters } = await supabaseAdmin
          .from("future_letters")
          .select("id, user_id")
          .eq("notified", false)
          .lte("open_at", today)
          .limit(200);
        for (const l of letters ?? []) {
          // Mark first, so a slow push never makes a second reminder.
          await supabaseAdmin.from("future_letters").update({ notified: true }).eq("id", l.id);
          sent += await pushToUser(l.user_id, {
            title: "💌 Je brief aan jezelf mag open!",
            body: "Een tijd geleden schreef je een brief aan jezelf. Hij mag nu open.",
            link: "/brieven",
            tag: `brief-${l.id}`,
          });
        }

        const now = new Date();
        const { data: events } = await supabaseAdmin
          .from("events")
          .select("id, title, starts_at")
          .gt("starts_at", now.toISOString())
          .lte("starts_at", new Date(now.getTime() + 60 * 60_000).toISOString());
        for (const e of events ?? []) {
          const { data: rsvps } = await supabaseAdmin
            .from("event_rsvps")
            .select("user_id")
            .eq("event_id", e.id)
            .eq("reminded", false);
          for (const r of rsvps ?? []) {
            await supabaseAdmin
              .from("event_rsvps")
              .update({ reminded: true })
              .eq("event_id", e.id)
              .eq("user_id", r.user_id);
            sent += await pushToUser(r.user_id, {
              title: `📅 Over ${minutesUntil(e.starts_at, now)} minuten: ${e.title}`,
              body: `Je hebt je aangemeld voor ${eventTime(e.starts_at)}. Tot zo!`,
              link: "/agenda",
              tag: `event-${e.id}`,
            });
          }
        }
        // New anonymous questions: one push to every active coach (not who asked, not the question).
        const { data: fresh } = await supabaseAdmin
          .from("anon_questions")
          .select("id")
          .eq("status", "nieuw")
          .eq("coaches_notified", false);
        if (fresh?.length) {
          await supabaseAdmin
            .from("anon_questions")
            .update({ coaches_notified: true })
            .in(
              "id",
              fresh.map((q) => q.id),
            );
          const { data: coaches } = await supabaseAdmin
            .from("coaches")
            .select("user_id")
            .eq("active", true);
          for (const c of coaches ?? [])
            sent += await pushToUser(c.user_id, {
              title: "🧑‍🏫 Nieuwe vraag voor de coaches",
              body:
                fresh.length === 1
                  ? "Er wacht een anonieme vraag op je antwoord."
                  : `Er wachten ${fresh.length} anonieme vragen op je antwoord.`,
              link: "/coach",
              tag: "coach-vragen",
            });
        }
        // Daily pet reminder (opt-in): at the member's hour, only if nothing was done today.
        const hourNow = dutchHourNow();
        const { data: wantReminder, error: reminderError } = await supabaseAdmin
          .from("profiles")
          .select("id, reminder_hour, reminded_on")
          .eq("daily_reminder", true)
          .eq("reminder_hour", hourNow)
          .or(`reminded_on.is.null,reminded_on.lt.${today}`)
          .limit(500);
        if (!reminderError) {
          const since = shiftDay(today, -90);
          for (const m of wantReminder ?? []) {
            // Mark first, so a slow push never makes a second reminder today.
            await supabaseAdmin.from("profiles").update({ reminded_on: today }).eq("id", m.id);
            const [care, diary] = await Promise.all([
              supabaseAdmin.from("pet_care").select("care_date").eq("user_id", m.id).gte("care_date", since),
              supabaseAdmin.from("diary_entries").select("created_at").eq("user_id", m.id).gte("created_at", since),
            ]);
            const days = new Set<string>([
              ...(care.data ?? []).map((c) => c.care_date),
              ...(diary.data ?? []).map((d) =>
                new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(new Date(d.created_at)),
              ),
            ]);
            if (
              !shouldRemind({
                enabled: true,
                hour: m.reminder_hour,
                remindedOn: m.reminded_on,
                today,
                hourNow,
                didSomethingToday: days.has(today),
              })
            )
              continue;
            sent += await pushToUser(m.id, { ...reminderPush(streakDays(days, shiftDay(today, -1))), tag: "dag-herinnering" });
          }
        }
        return Response.json({ sent });
      },
    },
  },
});
