import { supabase } from "@/integrations/supabase/client";
type FbEnv = {
  VITE_FIREBASE_APP_ID?: string;
  VITE_FIREBASE_VAPID_KEY?: string;
  VITE_FIREBASE_API_KEY?: string;
  VITE_FIREBASE_PROJECT_ID?: string;
};

const appId = (import.meta.env as FbEnv).VITE_FIREBASE_APP_ID;
const vapidKey = (import.meta.env as FbEnv).VITE_FIREBASE_VAPID_KEY;
const config = {
  apiKey: (import.meta.env as FbEnv).VITE_FIREBASE_API_KEY ?? "",
  projectId: (import.meta.env as FbEnv).VITE_FIREBASE_PROJECT_ID ?? "",
  appId: appId ?? "",
  messagingSenderId: appId?.split(":")[1] ?? "",
};

export type PushResult = "registered" | "not-configured" | "unsupported" | "open-in-new-tab" | "denied";

// Call from a click handler.
export async function enablePush(userId: string): Promise<PushResult> {
  if (!config.apiKey || !config.projectId || !appId || !vapidKey || !config.messagingSenderId) return "not-configured";
  const { getMessaging, getToken, isSupported } = await import("firebase/messaging");
  const { initializeApp, getApps } = await import("firebase/app");
  if (!("Notification" in window) || !(await isSupported())) return "unsupported";
  if (window.top !== window.self) return "open-in-new-tab";
  const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (perm !== "granted") return "denied";
  const reg = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${new URLSearchParams(config)}`);
  const app = getApps()[0] ?? initializeApp(config);
  const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: reg });
  if (!token) return "denied";
  await supabase.from("push_tokens").upsert({ token, user_id: userId });
  return "registered";
}

export const pushMessages: Record<PushResult, string> = {
  registered: "Pushmeldingen staan aan op dit apparaat.",
  "not-configured": "Pushmeldingen zijn nog niet ingesteld.",
  unsupported: "Deze browser ondersteunt geen pushmeldingen. Op iPhone: zet de app eerst op je beginscherm.",
  "open-in-new-tab": "Open de app in een eigen tabblad om meldingen aan te zetten.",
  denied: "Meldingen zijn geblokkeerd. Zet ze aan in de instellingen van je browser.",
};

// Shows pushes as an in-app toast while the app is open (browsers don't show them in the foreground).
export async function listenForeground(onPush: (p: { title: string; body: string; link?: string | undefined }) => void) {
  if (typeof window === "undefined" || !config.apiKey || !appId || !("Notification" in window)) return () => {};
  if (Notification.permission !== "granted") return () => {};
  const { getMessaging, onMessage, isSupported } = await import("firebase/messaging");
  const { initializeApp, getApps } = await import("firebase/app");
  if (!(await isSupported())) return () => {};
  const app = getApps()[0] ?? initializeApp(config);
  return onMessage(getMessaging(app), (m) => {
    onPush({ title: m.notification?.title ?? "Cerita", body: m.notification?.body ?? "", link: m.data?.["link"] });
  });
}
