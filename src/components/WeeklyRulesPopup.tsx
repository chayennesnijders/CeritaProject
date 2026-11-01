import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Riti } from "@/components/Riti";
import { challengeDay } from "@/lib/challenges";
import { mondayOf } from "@/lib/group-challenge";
import { CORE_RULES, rulesDue, tipForWeek } from "@/lib/weekly-rules";

const TOUR_KEY = "cerita-rondleiding-gezien";

/** Once a week: the house rules in short, with a new tip every week. Remembered on this device. */
export function WeeklyRulesPopup({ uid }: { uid: string | undefined }) {
  const monday = mondayOf(challengeDay());
  const key = uid ? `cerita-regels-week-${uid}` : null;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!key) return;
    try {
      // Not on top of the welcome tour for brand-new members.
      if (!localStorage.getItem(TOUR_KEY)) return;
      if (rulesDue(localStorage.getItem(key), monday)) setOpen(true);
    } catch {
      /* no storage: skip rather than show it every time */
    }
  }, [key, monday]);

  function done() {
    setOpen(false);
    try {
      if (key) localStorage.setItem(key, monday);
    } catch {
      /* fine */
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && done()}>
      <DialogContent
        className="max-h-[90vh] max-w-sm gap-3 overflow-y-auto rounded-3xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="items-center text-center">
          <Riti size={56} expression="blij" />
          <DialogTitle className="text-xl">Onze afspraken 💛</DialogTitle>
          <DialogDescription className="sr-only">
            Zo houden we CeritaProject samen een veilige plek.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-1.5 text-[13px] leading-snug">
          {CORE_RULES.map((r) => (
            <li key={r.text} className="flex gap-2">
              <span className="shrink-0">{r.emoji}</span>
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
        <p className="rounded-2xl bg-secondary p-3 text-xs text-secondary-foreground">
          <strong>💡 Tip van de week:</strong> {tipForWeek(monday)}
        </p>
        <p className="text-center text-[10px] leading-snug text-muted-foreground">
          Gaat het niet goed met je? Bel 113 (0800-0113) of de Kindertelefoon (0800-0432).
        </p>
        <Button onClick={done} className="h-12 w-full rounded-full text-base">
          Ik doe mee 🤍
        </Button>
        <Link
          to="/huisregels"
          onClick={done}
          className="text-center text-xs text-muted-foreground underline"
        >
          Alle huisregels lezen
        </Link>
      </DialogContent>
    </Dialog>
  );
}
