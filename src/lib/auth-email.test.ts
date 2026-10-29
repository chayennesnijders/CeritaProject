import { describe, expect, it } from "vitest";
import { mailsFor, verifyHook, verifyUrl, type HookPayload } from "./auth-email.server";

const secretBytes = new TextEncoder().encode("super-geheim-testsleutel-123456");
const secret = `v1,whsec_${btoa(String.fromCharCode(...secretBytes))}`;

async function sign(id: string, ts: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${id}.${ts}.${body}`),
  );
  return `v1,${btoa(String.fromCharCode(...new Uint8Array(sig)))}`;
}

describe("verifyHook", () => {
  const body = JSON.stringify({ hello: "wereld" });
  const now = 1_800_000_000;

  it("accepts a correctly signed request", async () => {
    const headers = new Headers({
      "webhook-id": "msg_1",
      "webhook-timestamp": String(now),
      "webhook-signature": await sign("msg_1", String(now), body),
    });
    expect(await verifyHook(secret, headers, body, now)).toBe(true);
  });

  it("rejects a changed body", async () => {
    const headers = new Headers({
      "webhook-id": "msg_1",
      "webhook-timestamp": String(now),
      "webhook-signature": await sign("msg_1", String(now), body),
    });
    expect(await verifyHook(secret, headers, body + " ", now)).toBe(false);
  });

  it("rejects an old timestamp", async () => {
    const ts = String(now - 600);
    const headers = new Headers({
      "webhook-id": "msg_1",
      "webhook-timestamp": ts,
      "webhook-signature": await sign("msg_1", ts, body),
    });
    expect(await verifyHook(secret, headers, body, now)).toBe(false);
  });
});

describe("mailsFor", () => {
  const base = (
    type: string,
    extra: Partial<HookPayload["email_data"]> = {},
    user: HookPayload["user"] = { email: "a@example.test" },
  ): HookPayload => ({
    user,
    email_data: {
      token: "123456",
      token_hash: "hash",
      redirect_to: "https://app.test/home",
      email_action_type: type,
      site_url: "https://app.test",
      ...extra,
    },
  });

  it("builds a verify link for signup", () => {
    expect(verifyUrl("https://x.supabase.co/", "hash", "signup", "https://app.test/home")).toBe(
      "https://x.supabase.co/auth/v1/verify?token=hash&type=signup&redirect_to=https%3A%2F%2Fapp.test%2Fhome",
    );
    const [mail] = mailsFor(base("signup"), "https://x.supabase.co", "https://app.test");
    expect(mail?.to).toBe("a@example.test");
  });

  it("sends email_change to the new address with token_hash and the old one with token_hash_new", () => {
    const mails = mailsFor(
      base(
        "email_change",
        { token_hash_new: "oud" },
        { email: "oud@example.test", new_email: "nieuw@example.test" },
      ),
      "https://x.supabase.co",
      "https://app.test",
    );
    expect(mails.map((m) => m.to)).toEqual(["nieuw@example.test", "oud@example.test"]);
  });

  it("ignores unknown types", () => {
    expect(mailsFor(base("iets_anders"), "https://x.supabase.co", "https://app.test")).toEqual([]);
  });
});
