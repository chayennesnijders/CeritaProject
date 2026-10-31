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

export type ServiceAccount = { project_id: string; client_email: string; private_key: string };

/**
 * Read FIREBASE_SERVICE_ACCOUNT forgivingly: the whole JSON file (also with real line breaks inside
 * the private key, quotes around it, or base64), and say in Dutch what is wrong, never the value.
 */
export function parseServiceAccount(raw: string | undefined): {
  sa: ServiceAccount | null;
  problem: string | null;
} {
  let text = (raw ?? "").trim().replace(/^'+|'+$/g, "");
  if (!text) return { sa: null, problem: "FIREBASE_SERVICE_ACCOUNT ontbreekt" };
  if (!text.includes("{")) {
    try {
      text = atob(text);
    } catch {
      /* not base64 */
    }
  }
  let obj: Partial<ServiceAccount> | null = null;
  try {
    obj = JSON.parse(text) as Partial<ServiceAccount>;
  } catch {
    // Fallback for a pasted file whose private key got real line breaks: pick the 3 fields out.
    const field = (k: string) =>
      new RegExp(`"${k}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`).exec(text)?.[1]?.replace(/\\n/g, "\n");
    const pick = {
      project_id: field("project_id"),
      client_email: field("client_email"),
      private_key: field("private_key"),
    };
    if (pick.project_id || pick.client_email || pick.private_key)
      obj = pick as Partial<ServiceAccount>;
  }
  if (!obj)
    return {
      sa: null,
      problem: "FIREBASE_SERVICE_ACCOUNT is geen geldig bestand (kopieer alles, van { tot })",
    };
  const missing = (["project_id", "client_email", "private_key"] as const).filter((k) => !obj![k]);
  if (missing.length)
    return { sa: null, problem: `FIREBASE_SERVICE_ACCOUNT mist ${missing.join(", ")}` };
  if (!obj.private_key!.includes("PRIVATE KEY"))
    return { sa: null, problem: "FIREBASE_SERVICE_ACCOUNT: de private_key is niet compleet" };
  return {
    sa: {
      project_id: obj.project_id!,
      client_email: obj.client_email!,
      private_key: obj.private_key!,
    },
    problem: null,
  };
}

/** Everything that stops push, by name only: web settings, the secret key, and whether they match. */
export function pushProblems(env: Record<string, string | undefined>): string[] {
  const web = resolveFirebaseConfig(env);
  const server = parseServiceAccount(env["FIREBASE_SERVICE_ACCOUNT"]);
  const problems = [...web.problems];
  if (server.problem) problems.push(server.problem);
  if (web.config && server.sa && web.config.projectId !== server.sa.project_id)
    problems.push(
      "VITE_FIREBASE_PROJECT_ID en FIREBASE_SERVICE_ACCOUNT horen bij verschillende Firebase-projecten",
    );
  return problems;
}
