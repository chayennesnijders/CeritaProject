import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { birthdayAge } from "@/lib/birthday";
import { challengeDay } from "@/lib/challenges";

const CONFETTI = ["🎉", "🎈", "✨", "🎊", "💖", "🌟"];

// Toont na het inloggen één keer per jaar een verjaardagskaart als het lid vandaag jarig is
// (Nederlandse datum), met een cadeautje: 25 punten voor het diertje (de server geeft die max. één keer per jaar).
// Per account en toestel onthouden we (localStorage) voor welk jaar de kaart al getoond is.
export function BirthdayPopup() {
  const { data: me } = useMe();
  const [age, setAge] = useState<number | null>(null);
  const [bonus, setBonus] = useState(0);

  useEffect(() => {
    const bd = me?.profile?.birthdate;
    if (!bd || !me) return;
    const day = challengeDay();
    const turns = birthdayAge(bd, day);
    if (turns === null) return;
    const key = `cerita-verjaardag-${me.user.id}-${day.slice(0, 4)}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      // Geen opslag (privévenster): dan gewoon tonen.
    }
    supabase.rpc("claim_birthday_bonus").then(({ data }) => {
      setBonus(typeof data === "number" ? data : 0);
      setAge(turns);
    });
  }, [me]);

  if (age === null) return null;
  const name = me?.profile?.display_name ?? "";
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-black/50 px-6" role="dialog" aria-modal="true" aria-label="Gefeliciteerd">
      {Array.from({ length: 24 }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className="pointer-events-none absolute -top-10 animate-[confetti_3.5s_linear_infinite] text-2xl"
          style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 8) * 0.4}s` }}
        >
          {CONFETTI[i % CONFETTI.length]}
        </span>
      ))}
      <div className="relative w-full max-w-sm animate-in zoom-in-90 rounded-3xl bg-card p-8 text-center shadow-soft duration-500">
        <p className="animate-bounce text-6xl">🎂</p>
        <h2 className="mt-4 font-display text-3xl text-primary">Gefeliciteerd{name ? `, ${name}` : ""}!</h2>
        <p className="mt-2 text-lg font-semibold">Je bent vandaag {age} jaar! 🥳</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Hiep hiep hoera! Het hele CeritaProject-team wenst je een superfijne verjaardag. Geniet van je dag, je verdient het 💛
        </p>
        {bonus > 0 && (
          <div className="mt-4 rounded-2xl bg-secondary p-4 text-secondary-foreground">
            <p className="text-3xl">🎁</p>
            <p className="mt-1 text-sm font-semibold">Cadeautje: +{bonus} punten voor je diertje!</p>
          </div>
        )}
        <button
          onClick={() => setAge(null)}
          className="mt-6 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground"
        >
          Dankjewel! 🎈
        </button>
      </div>
    </div>
  );
}
