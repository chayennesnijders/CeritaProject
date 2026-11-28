import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { APNS_PREFIX, apnsDeviceToken, apnsPayload, apnsTokenGone, isApnsToken, normaliseP8 } from "./apns";
import { apnsConfig } from "./apns.server";

describe("apns", () => {
  it("keeps iPhone tokens apart from FCM tokens", () => {
    expect(isApnsToken(`${APNS_PREFIX}abc123`)).toBe(true);
    expect(isApnsToken("fcm-token:APA91b")).toBe(false);
    expect(apnsDeviceToken(`${APNS_PREFIX}abc123`)).toBe("abc123");
  });
  it("builds the notification with the link for the tap", () => {
    expect(apnsPayload({ title: "Hoi", body: "Nieuw bericht", link: "/berichten/1", tag: "dm" })).toEqual({
      aps: { alert: { title: "Hoi", body: "Nieuw bericht" }, sound: "default", "thread-id": "dm" },
      link: "/berichten/1",
    });
  });
  it("accepts a pasted .p8 key with or without line breaks", () => {
    const pem = generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const flat = pem.replace(/\n/g, " ");
    expect(normaliseP8(flat)).toBe(pem);
    expect(normaliseP8(pem.replace(/\n/g, "\\n"))).toBe(pem);
    expect(apnsConfig({ APNS_KEY_P8: flat, APNS_KEY_ID: "ABC", APPLE_TEAM_ID: "T" })?.key).toBe(pem);
    expect(apnsConfig({ APNS_KEY_ID: "ABC" })).toBeNull();
  });
  it("forgets tokens Apple no longer knows", () => {
    expect(apnsTokenGone(410, "Unregistered")).toBe(true);
    expect(apnsTokenGone(400, "BadDeviceToken")).toBe(true);
    expect(apnsTokenGone(429, "TooManyRequests")).toBe(false);
  });
});
