import { useEffect, useState } from "react";
import { toast } from "sonner";

const KEY = "cerita-uitnodigen-later";
const LATER_DAYS = 14;
const URL_TO_SHARE = "https://app.ceritaproject.nl";
const TEXT =
  "Ik zit op CeritaProject, een app waar jongeren met elkaar praten over hoe het écht gaat. Je komt in groepen met leeftijdsgenoten, en het is gratis. Doe je mee?";

/** Share the invitation (the phone's share sheet, or copy when there is none). */
export async function shareInvite() {
  try {
    if (navigator.share) {
      await navigator.share({ title: "CeritaProject", text: TEXT, url: URL_TO_SHARE });
      return;
    }
    await navigator.clipboard.writeText(`${TEXT} ${URL_TO_SHARE}`);
    toast.success("Gekopieerd! Plak het in een appje naar je vriend(in).");
  } catch {
    /* sharing cancelled */
  }
}

/** Testers asked for "more people": a friendly way to invite a friend (they join their own age group). */
export function InviteFriendCard() {
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try {
      setHidden(Date.now() - Number(localStorage.getItem(KEY) ?? 0) < LATER_DAYS * 86_400_000);
    } catch {
      setHidden(false);
    }
  }, []);
  if (hidden) return null;

  const later = () => {
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* shows again next time */
    }
    setHidden(true);
  };
  const share = shareInvite;

  return (
    <section className="flex items-center gap-3 rounded-3xl bg-secondary p-4 text-secondary-foreground shadow-soft">
      <span className="text-3xl">👋</span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Nodig een vriend(in) uit</p>
        <p className="text-xs opacity-90">Hoe meer jongeren, hoe gezelliger de groepen. Je vriend(in) komt bij leeftijdsgenoten.</p>
        <div className="mt-2 flex gap-2">
          <button onClick={() => void share()} className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-foreground">
            Uitnodiging delen
          </button>
          <button onClick={later} className="rounded-full px-2 py-1.5 text-xs opacity-80">
            Later
          </button>
        </div>
      </div>
    </section>
  );
}
