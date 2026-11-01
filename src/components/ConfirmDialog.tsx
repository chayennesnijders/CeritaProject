import { useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * In-app "are you sure?" (native confirm() can be blocked in app views). `confirm(question)`
 * resolves true when the member taps the yes button.
 */
export function useConfirm() {
  const [ask, setAsk] = useState<{ title: string; yes: string } | null>(null);
  const done = useRef<((ok: boolean) => void) | null>(null);

  function confirm(title: string, yes = "Ja") {
    setAsk({ title, yes });
    return new Promise<boolean>((resolve) => {
      done.current = resolve;
    });
  }
  function finish(ok: boolean) {
    done.current?.(ok);
    done.current = null;
    setAsk(null);
  }

  const dialog = (
    <AlertDialog open={ask !== null} onOpenChange={(o) => !o && finish(false)}>
      <AlertDialogContent className="max-w-sm rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{ask?.title}</AlertDialogTitle>
          <AlertDialogDescription>Dit kun je niet ongedaan maken.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="rounded-full">Annuleren</AlertDialogCancel>
          <Button className="rounded-full" onClick={() => finish(true)}>
            {ask?.yes}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  return { confirm, dialog };
}
