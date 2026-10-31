import { describe, expect, it } from "vitest";
import { parseServiceAccount, pushProblems, resolveFirebaseConfig } from "./firebase-config";

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

describe("parseServiceAccount", () => {
  const key = "-----BEGIN PRIVATE KEY-----\\nMIIEabc\\n-----END PRIVATE KEY-----\\n";
  const file = `{\n  "type": "service_account",\n  "project_id": "ceritaproject",\n  "private_key": "${key}",\n  "client_email": "firebase-adminsdk@ceritaproject.iam.gserviceaccount.com"\n}`;
  it("reads the downloaded file as it is", () => {
    expect(parseServiceAccount(file).sa?.project_id).toBe("ceritaproject");
  });
  it("still works when the private key got real line breaks", () => {
    const broken = file.replace(/\\n/g, "\n");
    expect(broken).not.toContain("\\n");
    const r = parseServiceAccount(broken);
    expect(r.problem).toBeNull();
    expect(r.sa?.private_key).toContain("PRIVATE KEY");
  });
  it("says what is wrong without showing the value", () => {
    expect(parseServiceAccount("").problem).toMatch(/ontbreekt/);
    expect(parseServiceAccount("geheim123").problem).toMatch(/geen geldig bestand/);
    expect(parseServiceAccount('{"project_id":"x"}').problem).toMatch(
      /mist client_email, private_key/,
    );
  });
  it("notices when the keys come from two different Firebase projects", () => {
    const p = pushProblems({
      ...good,
      FIREBASE_SERVICE_ACCOUNT: file.replace('"ceritaproject"', '"ander"'),
    });
    expect(p.join(" ")).toMatch(/verschillende Firebase-projecten/);
    expect(pushProblems({ ...good, FIREBASE_SERVICE_ACCOUNT: file })).toEqual([]);
  });
});
