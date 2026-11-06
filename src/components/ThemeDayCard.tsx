import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { themeDaysOn, themeTip, type ThemeAudience } from "@/lib/theme-days";

/**
 * Today's special day as a card on the home screen, for one audience. On the bigger days it also
 * opens once as a pop-up (remembered per device and day, so it never nags).
 */
export function ThemeDayCard({ day, audience }: { day: string; audience: ThemeAudience }) {
  const today = themeDaysOn(day).find((t) => themeTip(t, audience));
  const [popup, setPopup] = useState(false);
  const key = today ? `cerita-themadag-${day}-${audience}` : null;

  useEffect(() => {
    if (!today?.popup || !key) return;
    try {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, "1");
        setPopup(true);
      }
    } catch {
      // No storage: then just the card.
    }
  }, [today?.popup, key]);

  if (!today) return null;
  const tip = themeTip(today, audience);
  return (
    <>
      <section className="flex items-start gap-3 rounded-3xl border-2 border-primary/60 bg-card p-4 shadow-soft">
        <span className="text-3xl">{today.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Vandaag: {today.title}</p>
          <p className="mt-1 text-sm">{tip}</p>
          {today.help && <p className="mt-2 text-xs text-muted-foreground">{today.help}</p>}
        </div>
      </section>
      <Dialog open={popup} onOpenChange={setPopup}>
        <DialogContent className="max-w-sm rounded-3xl text-center">
          <div className="text-5xl">{today.emoji}</div>
          <DialogHeader>
            <DialogTitle className="text-center">{today.title}</DialogTitle>
            <DialogDescription className="text-center text-base text-foreground">{tip}</DialogDescription>
          </DialogHeader>
          {today.help && <p className="text-sm text-muted-foreground">{today.help}</p>}
          <Button className="w-full rounded-full" onClick={() => setPopup(false)}>
            Dankjewel 💛
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
