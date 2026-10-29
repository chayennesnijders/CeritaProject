import { createFileRoute } from "@tanstack/react-router";

// POST /api/auth-email — Supabase "Send Email" auth hook (Authentication → Hooks).
// Renders the Cerita templates and sends them with Resend. Without this hook
// Supabase simply sends its own standard emails.
export const Route = createFileRoute("/api/auth-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const fail = (status: number, message: string) =>
          Response.json({ error: { http_code: status, message } }, { status });
        const secret = process.env["SEND_EMAIL_HOOK_SECRET"];
        const resendKey = process.env["RESEND_API_KEY"];
        const supabaseUrl = process.env["SUPABASE_URL"];
        if (!secret || !resendKey || !supabaseUrl) return fail(500, "Email hook is not configured");

        const { verifyHook, mailsFor, sendWithResend } = await import("@/lib/auth-email.server");
        const body = await request.text();
        if (!(await verifyHook(secret, request.headers, body)))
          return fail(401, "Invalid signature");

        const siteUrl = process.env["SITE_URL"] ?? new URL(request.url).origin;
        const from = process.env["EMAIL_FROM"] ?? "CeritaProject <noreply@notify.ceritaproject.nl>";
        try {
          for (const mail of mailsFor(JSON.parse(body), supabaseUrl, siteUrl))
            await sendWithResend(resendKey, from, mail);
        } catch (e) {
          console.error(e);
          return fail(500, "Sending the email failed");
        }
        return Response.json({});
      },
    },
  },
});
