import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/lib/account.functions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/** "Account verwijderen" with an in-app confirmation (native confirm dialogs can be blocked in app views). */
export function DeleteAccount() {
  const del = useServerFn(deleteMyAccount);
  const qc = useQueryClient();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

  async function confirmDelete() {
    setBusy(true);
    try {
      await del();
      await qc.cancelQueries();
      qc.clear();
      await supabase.auth.signOut();
      toast.success("Je account is verwijderd. Dag! 👋");
      nav({ to: "/", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Account verwijderen lukte niet.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
      <h2 className="text-lg">Account verwijderen</h2>
      <p className="text-sm text-muted-foreground">
        Hiermee verdwijnen je profiel, berichten, dagboek, diertje en foto's voor altijd.
      </p>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full rounded-full border-destructive text-destructive hover:bg-destructive/10"
          >
            Account verwijderen
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
            <AlertDialogDescription>
              Alles van jou wordt gewist en dat kun je niet meer terugdraaien. Bestellingen uit de
              shop bewaren we nog even voor de boekhouding.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy} className="rounded-full">
              Nee, toch niet
            </AlertDialogCancel>
            <Button
              disabled={busy}
              onClick={confirmDelete}
              className="rounded-full bg-destructive text-white hover:bg-destructive/90"
            >
              {busy ? "Bezig…" : "Ja, verwijder alles"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
