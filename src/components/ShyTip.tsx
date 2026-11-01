import { useEffect, useState } from "react";
import { Riti } from "@/components/Riti";

/**
 * For members who only read along: a gentle note from Riti that nobody here thinks you're weird,
 * and that a short reply or a 🤍 is enough. Tap it away; it stays away for that group.
 */
export function ShyTip({ groupId }: { groupId: string }) {
  const key = `cerita-shy-tip-${groupId}`;
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try {
      setHidden(localStorage.getItem(key) === "1");
    } catch {
      setHidden(false);
    }
  }, [key]);
  if (hidden) return null;
  function close() {
    setHidden(true);
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* not remembered: then it shows again next time */
    }
  }
  return (
    <div className="flex items-start gap-2 rounded-3xl bg-secondary p-3 text-secondary-foreground shadow-soft">
      <Riti size={52} expression="troostend" />
      <div className="min-w-0 flex-1 text-xs leading-snug">
        <p className="font-semibold">Vind je het spannend om iets te zeggen?</p>
        <p className="mt-0.5">
          Dat vinden veel mensen hier. Niemand vindt je raar: iedereen voelt zich weleens zo. Je
          hoeft niks lang te schrijven. Tik op <strong>🤍 Snel reageren</strong> onder een bericht,
          of houd een bericht ingedrukt voor een emoji.
        </p>
      </div>
      <button onClick={close} aria-label="Sluiten" className="shrink-0 px-1 text-sm">
        ✕
      </button>
    </div>
  );
}
