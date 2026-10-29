import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";

// Toont één keer per jaar een verjaardagskaart als het lid vandaag jarig is,
// met een cadeautje: 25 punten voor het diertje (eenmalig per jaar).
// We onthouden per toestel (localStorage) voor welk jaar de kaart al getoond is.
export function BirthdayPopup() {
  const { data: me } = useMe();
  const [show, setShow] = useState(false);
  const [bonus, setBonus] = useState(0);

  useEffect(() => {
    const bd = me?.profile?.birthdate;
    if (!bd) return;
    const birth = new Date(bd);
    const now = new Date();
    if (birth.getMonth() !== now.getMonth() || birth.getDate() !== now.getDate()) return;
    const key = `cerita-verjaardag-${now.getFullYear()}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    // Cadeau ophalen: de server geeft 25 punten, max één keer per jaar.
    supabase.rpc("claim_birthday_bonus").then(({ data }) => {
      setBonus(typeof data === "number" ? data : 0);
      setShow(true);
    });
  }, [me]);

  if (!show) return null;
  const name = me?.profile?.display_name ?? "";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-3xl bg-card p-8 text-center shadow-soft">
        <p className="text-5xl">🎂</p>
        <h2 className="mt-4 font-display text-3xl text-primary">Gefeliciteerd{name ? `, ${name}` : ""}!</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Vandaag is jouw dag. We wensen je een hele fijne verjaardag! 🎉
        </p>
        {bonus > 0 && (
          <div className="mt-4 rounded-2xl bg-secondary p-4 text-secondary-foreground">
            <p className="text-3xl">🎁</p>
            <p className="mt-1 text-sm font-semibold">Cadeautje: +{bonus} punten voor je diertje!</p>
          </div>
        )}
        <button
          onClick={() => setShow(false)}
          className="mt-6 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground"
        >
          Dankjewel! 🥳
        </button>
      </div>
    </div>
  );
}
