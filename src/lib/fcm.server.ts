// Firebase Cloud Messaging (HTTP v1) without extra libraries: a Google service account
// signs a short JWT, which is swapped for an access token that is cached until it expires.
// FIREBASE_SERVICE_ACCOUNT holds the service-account JSON downloaded from the Firebase console.

import { parseServiceAccount, type ServiceAccount } from "@/lib/firebase-config";

let cached: { token: string; expires: number } | undefined;

export function fcmServiceAccount(): ServiceAccount | null {
  return parseServiceAccount(process.env["FIREBASE_SERVICE_ACCOUNT"]).sa;
}

const b64url = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

async function signJwt(sa: ServiceAccount, now: number) {
  const enc = new TextEncoder();
  const header = b64url(enc.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claims = b64url(
    enc.encode(
      JSON.stringify({
        iss: sa.client_email,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      }),
    ),
  );
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(`${header}.${claims}`));
  return `${header}.${claims}.${b64url(sig)}`;
}

async function accessToken(sa: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.expires > now + 60) return cached.token;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: await signJwt(sa, now),
    }),
  });
  if (!res.ok) throw new Error(`Google token request failed [${res.status}]: ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: json.access_token, expires: now + json.expires_in };
  return json.access_token;
}

/** Sends one FCM message ({ token, notification, data, webpush }). */
export async function sendFcm(sa: ServiceAccount, message: Record<string, unknown>) {
  return fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await accessToken(sa)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });
}
