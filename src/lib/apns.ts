/** Push to the iPhone app straight through Apple (APNs). Pure helpers; the sender is in apns.server.ts. */

/** Tokens from the iPhone app are stored with this prefix in push_tokens (web/Android tokens are FCM). */
export const APNS_PREFIX = "apns:";
export const IOS_BUNDLE_ID = "com.ceritaproject.mijnapp";

export const isApnsToken = (token: string) => token.startsWith(APNS_PREFIX);
export const apnsDeviceToken = (token: string) => token.slice(APNS_PREFIX.length);

/** The notification Apple shows; `link` comes back to the app when it is tapped. */
export function apnsPayload(msg: { title: string; body: string; link: string; tag: string }) {
  return {
    aps: { alert: { title: msg.title, body: msg.body }, sound: "default", "thread-id": msg.tag },
    link: msg.link,
  };
}

/** Normalises a .p8 key pasted into an environment variable (literal \n, missing line breaks). */
export function normaliseP8(raw: string) {
  const body = raw
    .replace(/\\n/g, "\n")
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  if (!body) return "";
  const lines = body.match(/.{1,64}/g) ?? [];
  return `-----BEGIN PRIVATE KEY-----\n${lines.join("\n")}\n-----END PRIVATE KEY-----\n`;
}

/** Apple says to forget a token on these answers. */
export const apnsTokenGone = (status: number, reason: string) =>
  status === 410 || (status === 400 && /BadDeviceToken|DeviceTokenNotForTopic/.test(reason));
