import { describe, expect, it } from "vitest";
import { resolveFirebaseConfig } from "./firebase-config";

const good = {
  VITE_FIREBASE_API_KEY: "AIzaSyExample123",
  VITE_FIREBASE_PROJECT_ID: "ceritaproject",
  VITE_FIREBASE_APP_ID: "1:123456789:web:abc123def",
  VITE_FIREBASE_VAPID_KEY: "B".repeat(88),
};

describe("resolveFirebaseConfig", () => {
  it("builds the config and the sender id from the app id", () => {
    const r = resolveFirebaseConfig(good);
    expect(r.problems).toEqual([]);
    expect(r.config?.messagingSenderId).toBe("123456789");
  });
  it("cleans spaces and quotes from copying", () => {
    const r = resolveFirebaseConfig({
      ...good,
      VITE_FIREBASE_APP_ID: ' "1:123456789:web:abc123def", ',
    });
    expect(r.config?.appId).toBe("1:123456789:web:abc123def");
  });
  it("accepts names without VITE_", () => {
    const { VITE_FIREBASE_VAPID_KEY, ...rest } = good;
    expect(
      resolveFirebaseConfig({ ...rest, FIREBASE_VAPID_KEY: VITE_FIREBASE_VAPID_KEY }).config,
    ).not.toBeNull();
  });
  it("names what is missing or wrong, never the values", () => {
    const r = resolveFirebaseConfig({
      ...good,
      VITE_FIREBASE_APP_ID: "Cerita",
      VITE_FIREBASE_VAPID_KEY: "",
    });
    expect(r.config).toBeNull();
    expect(r.problems.join(" ")).toMatch(/APP_ID klopt niet/);
    expect(r.problems.join(" ")).toMatch(/VAPID_KEY ontbreekt/);
    expect(r.problems.join(" ")).not.toMatch(/Cerita/);
  });
});
