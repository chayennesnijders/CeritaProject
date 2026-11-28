import { createPrivateKey, sign } from "node:crypto";
import { connect } from "node:http2";
import { IOS_BUNDLE_ID, apnsPayload, normaliseP8 } from "@/lib/apns";

type ApnsConfig = { key: string; keyId: string; teamId: string };

/** APNS_KEY_P8, APNS_KEY_ID and APPLE_TEAM_ID from Vercel; null while push to iPhone is not set up. */
export function apnsConfig(env: Record<string, string | undefined> = process.env): ApnsConfig | null {
  const key = normaliseP8(env["APNS_KEY_P8"] ?? "");
  const keyId = env["APNS_KEY_ID"]?.trim();
  const teamId = env["APPLE_TEAM_ID"]?.trim();
  return key && keyId && teamId ? { key, keyId, teamId } : null;
}

let cached: { jwt: string; at: number; keyId: string } | undefined;

/** Apple's provider token (ES256 JWT), reused for 40 minutes (Apple allows up to an hour). */
function providerToken(c: ApnsConfig) {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.keyId === c.keyId && now - cached.at < 40 * 60) return cached.jwt;
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const input = `${b64({ alg: "ES256", kid: c.keyId })}.${b64({ iss: c.teamId, iat: now })}`;
  const sig = sign("sha256", Buffer.from(input), { key: createPrivateKey(c.key), dsaEncoding: "ieee-p1363" });
  cached = { jwt: `${input}.${sig.toString("base64url")}`, at: now, keyId: c.keyId };
  return cached.jwt;
}

/** Sends one notification to one iPhone. Resolves with Apple's status and reason (never throws). */
export function sendApns(
  c: ApnsConfig,
  deviceToken: string,
  msg: { title: string; body: string; link: string; tag: string },
): Promise<{ status: number; reason: string }> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (r: { status: number; reason: string }) => {
      if (done) return;
      done = true;
      client.close();
      resolve(r);
    };
    const client = connect("https://api.push.apple.com");
    client.on("error", (e) => finish({ status: 0, reason: String(e) }));
    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${providerToken(c)}`,
      "apns-topic": IOS_BUNDLE_ID,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    });
    let status = 0;
    let body = "";
    req.on("response", (h) => (status = Number(h[":status"] ?? 0)));
    req.setEncoding("utf8");
    req.on("data", (d) => (body += d));
    req.on("end", () => {
      let reason = "";
      try {
        reason = body ? (JSON.parse(body) as { reason?: string }).reason ?? "" : "";
      } catch {
        reason = body;
      }
      finish({ status, reason });
    });
    req.on("error", (e) => finish({ status: 0, reason: String(e) }));
    req.setTimeout(10_000, () => finish({ status: 0, reason: "timeout" }));
    req.end(JSON.stringify(apnsPayload(msg)));
  });
}
