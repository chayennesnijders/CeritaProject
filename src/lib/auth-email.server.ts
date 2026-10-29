import * as React from "react";
import { render } from "@react-email/render";
import { SignupEmail } from "@/lib/email-templates/signup";
import { InviteEmail } from "@/lib/email-templates/invite";
import { MagicLinkEmail } from "@/lib/email-templates/magic-link";
import { RecoveryEmail } from "@/lib/email-templates/recovery";
import { EmailChangeEmail } from "@/lib/email-templates/email-change";
import { ReauthenticationEmail } from "@/lib/email-templates/reauthentication";

// Supabase "Send Email" auth hook: Supabase posts every auth email here (signed with
// the Standard Webhooks scheme) and we render our own templates and send them via Resend.

const SITE_NAME = "CeritaProject";

export type HookPayload = {
  user: { email: string; new_email?: string };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
};

const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const toB64 = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b)));

/** Checks the webhook-signature header against SEND_EMAIL_HOOK_SECRET ("v1,whsec_…"). */
export async function verifyHook(
  secret: string,
  headers: Headers,
  body: string,
  nowSec = Math.floor(Date.now() / 1000),
) {
  const id = headers.get("webhook-id");
  const ts = headers.get("webhook-timestamp");
  const sigs = headers.get("webhook-signature");
  if (!id || !ts || !sigs) return false;
  if (Math.abs(nowSec - Number(ts)) > 5 * 60) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    fromB64(secret.replace(/^v1,/, "").replace(/^whsec_/, "")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = toB64(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${body}`)),
  );
  return sigs.split(" ").some((s) => s.split(",")[1] === expected);
}

export function verifyUrl(
  supabaseUrl: string,
  tokenHash: string,
  type: string,
  redirectTo: string,
) {
  const q = new URLSearchParams({ token: tokenHash, type, redirect_to: redirectTo });
  return `${supabaseUrl.replace(/\/+$/, "")}/auth/v1/verify?${q}`;
}

type Mail = { to: string; subject: string; element: React.ReactElement };

/** Turns one hook call into the emails to send (email_change can mean two: old and new address). */
export function mailsFor(p: HookPayload, supabaseUrl: string, siteUrl: string): Mail[] {
  const d = p.email_data;
  const type = d.email_action_type;
  const url = (hash: string) => verifyUrl(supabaseUrl, hash, type, d.redirect_to || siteUrl);
  switch (type) {
    case "signup":
      return [
        {
          to: p.user.email,
          subject: "Bevestig je e-mailadres voor CeritaProject",
          element: React.createElement(SignupEmail, {
            siteName: SITE_NAME,
            siteUrl,
            recipient: p.user.email,
            confirmationUrl: url(d.token_hash),
          }),
        },
      ];
    case "invite":
      return [
        {
          to: p.user.email,
          subject: "Je bent uitgenodigd voor CeritaProject",
          element: React.createElement(InviteEmail, {
            siteName: SITE_NAME,
            siteUrl,
            confirmationUrl: url(d.token_hash),
          }),
        },
      ];
    case "magiclink":
      return [
        {
          to: p.user.email,
          subject: "Je inloglink voor CeritaProject",
          element: React.createElement(MagicLinkEmail, {
            siteName: SITE_NAME,
            confirmationUrl: url(d.token_hash),
          }),
        },
      ];
    case "recovery":
      return [
        {
          to: p.user.email,
          subject: "Kies een nieuw wachtwoord voor CeritaProject",
          element: React.createElement(RecoveryEmail, {
            siteName: SITE_NAME,
            confirmationUrl: url(d.token_hash),
          }),
        },
      ];
    case "reauthentication":
      return [
        {
          to: p.user.email,
          subject: "Je bevestigingscode voor CeritaProject",
          element: React.createElement(ReauthenticationEmail, { token: d.token }),
        },
      ];
    case "email_change": {
      // Supabase swaps these for backwards compatibility: token_hash belongs to the NEW
      // address, token_hash_new to the CURRENT one (only set with "secure email change").
      const newEmail = p.user.new_email ?? "";
      const mail = (to: string, hash: string): Mail => ({
        to,
        subject: "Bevestig je nieuwe e-mailadres",
        element: React.createElement(EmailChangeEmail, {
          siteName: SITE_NAME,
          oldEmail: p.user.email,
          email: p.user.email,
          newEmail,
          confirmationUrl: url(hash),
        }),
      });
      return [
        ...(newEmail && d.token_hash ? [mail(newEmail, d.token_hash)] : []),
        ...(d.token_hash_new ? [mail(p.user.email, d.token_hash_new)] : []),
      ];
    }
    default:
      return [];
  }
}

export async function sendWithResend(apiKey: string, from: string, mail: Mail) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [mail.to],
      subject: mail.subject,
      html: await render(mail.element),
    }),
  });
  if (!res.ok) throw new Error(`Resend [${res.status}]: ${await res.text()}`);
}
