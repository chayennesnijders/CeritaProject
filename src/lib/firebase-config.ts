/**
 * The public Firebase web settings for push. They are not secret (every browser gets them), so the
 * server can hand them out at runtime too: then a forgotten rebuild after changing them in Vercel
 * no longer breaks push. Only names of missing or odd settings are reported, never their values.
 */
export type FirebaseWebConfig = {
  apiKey: string;
  projectId: string;
  appId: string;
  messagingSenderId: string;
  vapidKey: string;
};

export const FIREBASE_WEB_KEYS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_FIREBASE_VAPID_KEY",
] as const;

/** Trim spaces and stray quotes that easily come along when copying from the Firebase console. */
function clean(v: string | undefined) {
  return (v ?? "")
    .trim()
    .replace(/^["'`]+|["'`,;]+$/g, "")
    .trim();
}

export function resolveFirebaseConfig(env: Record<string, string | undefined>): {
  config: FirebaseWebConfig | null;
  problems: string[];
} {
  // Also accept the same names without VITE_ in front.
  const get = (k: (typeof FIREBASE_WEB_KEYS)[number]) =>
    clean(env[k]) || clean(env[k.replace(/^VITE_/, "")]);
  const apiKey = get("VITE_FIREBASE_API_KEY");
  const projectId = get("VITE_FIREBASE_PROJECT_ID");
  const appId = get("VITE_FIREBASE_APP_ID");
  const vapidKey = get("VITE_FIREBASE_VAPID_KEY");
  const problems: string[] = [];
  if (!apiKey) problems.push("VITE_FIREBASE_API_KEY ontbreekt");
  else if (!apiKey.startsWith("AIza"))
    problems.push("VITE_FIREBASE_API_KEY klopt niet (begint normaal met AIza)");
  if (!projectId) problems.push("VITE_FIREBASE_PROJECT_ID ontbreekt");
  if (!appId) problems.push("VITE_FIREBASE_APP_ID ontbreekt");
  else if (!/^\d+:\d+:web:[A-Za-z0-9]+$/.test(appId))
    problems.push("VITE_FIREBASE_APP_ID klopt niet (ziet eruit als 1:123456789:web:abc123)");
  if (!vapidKey) problems.push("VITE_FIREBASE_VAPID_KEY ontbreekt");
  else if (vapidKey.length < 60)
    problems.push("VITE_FIREBASE_VAPID_KEY is te kort (het is een lange code van ±88 tekens)");
  if (problems.length) return { config: null, problems };
  return {
    config: { apiKey, projectId, appId, vapidKey, messagingSenderId: appId.split(":")[1]! },
    problems,
  };
}
