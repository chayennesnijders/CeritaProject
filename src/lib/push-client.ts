import { supabase } from "@/integrations/supabase/client";
import { resolveFirebaseConfig, type FirebaseWebConfig } from "@/lib/firebase-config";
import { getFirebaseWebConfig } from "@/lib/push.functions";

/** What was wrong the last time push could not be set up (names only, shown in the message). */
let lastProblems: string[] = [];
let loading: Promise<FirebaseWebConfig | null> | undefined;

/** Firebase settings from the build, or else from the server at runtime. */
function loadConfig(): Promise<FirebaseWebConfig | null> {
  loading ??= (async () => {
    const built = resolveFirebaseConfig(import.meta.env as Record<string, string | undefined>);
    if (built.config) return built.config;
    try {
      const fromServer = await getFirebaseWebConfig();
      lastProblems = fromServer.problems;
      return fromServer.config;
    } catch {
      lastProblems = built.problems;
      return null;
    }
  })();
  return loading;
}

// Fetch the settings as soon as the app opens: asking for permission must happen right after a tap,
// so there is no time to wait for the server then.
if (typeof window !== "undefined") void loadConfig();

export type PushResult =
  "registered" | "not-configured" | "unsupported" | "open-in-new-tab" | "denied";

// Call from a click handler.
export async function enablePush(userId: string): Promise<PushResult> {
  const fb = await loadConfig();
  if (!fb) {
    loading = undefined; // try again next time (maybe the settings were just fixed)
    return "not-configured";
  }
  const { vapidKey, ...config } = fb;
  const { getMessaging, getToken, isSupported } = await import("firebase/messaging");
  const { initializeApp, getApps } = await import("firebase/app");
  if (!("Notification" in window) || !(await isSupported())) return "unsupported";
  if (window.top !== window.self) return "open-in-new-tab";
  const perm =
    Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (perm !== "granted") return "denied";
  const reg = await navigator.serviceWorker.register(
    `/firebase-messaging-sw.js?${new URLSearchParams(config)}`,
  );
  const app = getApps()[0] ?? initializeApp(config);
  const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: reg });
  if (!token) return "denied";
  await supabase.from("push_tokens").upsert({ token, user_id: userId });
  return "registered";
}

export const pushMessages: Record<PushResult, string> = {
  registered: "Pushmeldingen staan aan op dit apparaat.",
  "not-configured": "Pushmeldingen zijn nog niet ingesteld.",
  unsupported:
    "Deze browser ondersteunt geen pushmeldingen. Op iPhone: zet de app eerst op je beginscherm.",
  "open-in-new-tab": "Open de app in een eigen tabblad om meldingen aan te zetten.",
  denied: "Meldingen zijn geblokkeerd. Zet ze aan in de instellingen van je browser.",
};

/** The message for a result; for "not ingesteld" it also says which Firebase setting is missing. */
export function pushMessage(r: PushResult) {
  if (r === "not-configured" && lastProblems.length)
    return `${pushMessages[r]} Controleer in Vercel: ${lastProblems.join("; ")}.`;
  return pushMessages[r];
}

// Shows pushes as an in-app toast while the app is open (browsers don't show them in the foreground).
export async function listenForeground(
  onPush: (p: { title: string; body: string; link?: string | undefined }) => void,
) {
  if (typeof window === "undefined" || !("Notification" in window)) return () => {};
  if (Notification.permission !== "granted") return () => {};
  const fb = await loadConfig();
  if (!fb) return () => {};
  const { vapidKey: _vapid, ...config } = fb;
  const { getMessaging, onMessage, isSupported } = await import("firebase/messaging");
  const { initializeApp, getApps } = await import("firebase/app");
  if (!(await isSupported())) return () => {};
  const app = getApps()[0] ?? initializeApp(config);
  return onMessage(getMessaging(app), (m) => {
    onPush({
      title: m.notification?.title ?? "Cerita",
      body: m.notification?.body ?? "",
      link: m.data?.["link"],
    });
  });
}
