export type Platform = "ios" | "android" | "other";

/** Which phone is this, from the browser's user agent. */
export function platformOf(userAgent: string): Platform {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "other";
}

/**
 * Samsung Internet installs web apps in its own way, and Google Play Protect sometimes blocks
 * that install ("Onveilige app geblokkeerd"). Installing from Chrome works.
 */
export const isSamsungBrowser = (userAgent: string) => /SamsungBrowser/i.test(userAgent);

/** Show the "put the app on your home screen" guide once, only on a phone, and not when it is already installed. */
export const shouldShowInstall = (p: { platform: Platform; standalone: boolean; seen: boolean }) =>
  p.platform !== "other" && !p.standalone && !p.seen;

export const INSTALL_STEPS: Record<"ios" | "android", { emoji: string; text: string }[]> = {
  ios: [
    { emoji: "🧭", text: "Open de app in Safari (niet in Instagram of TikTok)." },
    { emoji: "⬆️", text: "Tik onderaan op de Deel-knop: het vierkantje met een pijl omhoog." },
    { emoji: "➕", text: "Scroll naar beneden en tik op ‘Zet op beginscherm’." },
    {
      emoji: "✅",
      text: "Tik rechtsboven op ‘Voeg toe’. Open CeritaProject voortaan via het icoontje.",
    },
  ],
  android: [
    {
      emoji: "🌐",
      text: "Open de app in Chrome (niet in Samsung Internet: daar kan Google de installatie blokkeren).",
    },
    { emoji: "⋮", text: "Tik rechtsboven op de drie puntjes." },
    { emoji: "📲", text: "Tik op ‘App installeren’ of ‘Toevoegen aan startscherm’." },
    { emoji: "✅", text: "Bevestig. Open CeritaProject voortaan via het icoontje." },
  ],
};
