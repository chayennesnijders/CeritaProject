import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { HelpLines } from "@/components/HelpLines";
import { Riti } from "@/components/Riti";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

/** Gentle help after someone writes about suicide or self-harm (see showCareHelp in lib/care). */
export function CareHelpDialog() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("cerita-care-help", show);
    return () => window.removeEventListener("cerita-care-help", show);
  }, []);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="flex justify-center">
          <Riti size={110} expression="troostend" />
        </div>
        <DialogTitle className="text-center">Hé, hoe gaat het echt met je? 💛</DialogTitle>
        <DialogDescription className="text-center">
          Wat je schreef klinkt zwaar. Je hoeft dit niet alleen te dragen. Praat erover met iemand,
          gratis en anoniem:
        </DialogDescription>
        <HelpLines compact />
        <p className="text-center text-xs text-muted-foreground">
          Een beheerder van CeritaProject kijkt ook even mee, zodat iemand je kan helpen.
        </p>
        <div className="flex flex-col gap-2">
          <Button asChild className="rounded-full">
            <Link to="/hulp" onClick={() => setOpen(false)}>
              Meer hulp bekijken
            </Link>
          </Button>
          <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
            Sluiten
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
