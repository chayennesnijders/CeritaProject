import { useRef, useState } from "react";
import { Riti } from "@/components/Riti";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { isMean } from "@/lib/kindness";

/**
 * "Eerst even nadenken": before a message with mean words goes out, Riti asks whether you are sure.
 * `confirmKind(text)` resolves true to send, false to change it. Mean words are hidden anyway.
 */
export function useKindCheck() {
  const [open, setOpen] = useState(false);
  const answer = useRef<((send: boolean) => void) | null>(null);

  function confirmKind(text: string) {
    if (!isMean(text)) return Promise.resolve(true);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      answer.current = resolve;
    });
  }
  function done(send: boolean) {
    setOpen(false);
    answer.current?.(send);
    answer.current = null;
  }

  const dialog = (
    <AlertDialog open={open} onOpenChange={(o) => !o && done(false)}>
      <AlertDialogContent className="max-w-sm rounded-3xl">
        <div className="flex justify-center">
          <Riti size={110} expression="denkend" />
        </div>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center">
            Weet je zeker dat je dit wilt sturen?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Er staan woorden in die iemand pijn kunnen doen. Die worden verborgen met ✱✱✱. Misschien
            kun je het ook anders zeggen? 💛
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full rounded-full" onClick={() => done(false)}>
            Ik pas het aan
          </Button>
          <Button variant="outline" className="w-full rounded-full" onClick={() => done(true)}>
            Toch sturen
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  return { confirmKind, dialog };
}
