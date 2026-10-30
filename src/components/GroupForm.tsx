import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GROUP_EMOJIS, groupFormError } from "@/lib/groups";

type Values = { name: string; description: string; emoji: string };

/** Make a new group, or (for its maker) change it or close it. */
export function GroupForm({
  open,
  onOpenChange,
  initial,
  onSubmit,
  onCloseGroup,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Set when editing an existing group. */
  initial?: Values | undefined;
  onSubmit: (v: Values) => Promise<void>;
  onCloseGroup?: (() => Promise<void>) | undefined;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState<string>(GROUP_EMOJIS[0]);
  const [busy, setBusy] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setDescription(initial?.description ?? "");
    setEmoji(initial?.emoji ?? GROUP_EMOJIS[0]);
    setConfirmClose(false);
  }, [open, initial?.name, initial?.description, initial?.emoji]);

  const error = name ? groupFormError(name, description) : null;
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-sm overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle>{initial ? "⚙️ Jouw groep" : "➕ Maak je eigen groep"}</DialogTitle>
          <DialogDescription>
            {initial
              ? "Pas de naam of omschrijving aan, of hef de groep op."
              : "Alleen leden van jouw leeftijd zien je groep. Jij wordt meteen lid, en anderen kunnen meedoen of jij nodigt ze uit."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-sm font-semibold">Plaatje</p>
            <div className="grid grid-cols-6 gap-2">
              {GROUP_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  aria-label={`Plaatje ${e}`}
                  className={`grid aspect-square place-items-center rounded-2xl text-2xl ${emoji === e ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Naam</span>
            <Input
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bijvoorbeeld: Samen gamen"
              className="h-12 rounded-2xl"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Waar gaat de groep over? (mag leeg)</span>
            <Textarea
              value={description}
              maxLength={140}
              rows={3}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-2xl"
            />
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <p className="text-xs text-muted-foreground">
            De huisregels gelden ook in jouw groep. Beheerders kunnen meekijken en de groep sluiten
            als dat nodig is.
          </p>
          <Button
            disabled={busy || !name || !!error}
            onClick={() =>
              run(() => onSubmit({ name: name.trim(), description: description.trim(), emoji }))
            }
            className="h-12 w-full rounded-full"
          >
            {busy ? "Even geduld…" : initial ? "Opslaan" : "Groep maken"}
          </Button>
          {initial && onCloseGroup && (
            <div className="border-t pt-3 text-center">
              {confirmClose ? (
                <div className="rounded-2xl bg-muted p-3">
                  <p className="text-sm font-semibold">Groep echt opheffen?</p>
                  <p className="text-xs text-muted-foreground">
                    Niemand kan er dan nog in. Dit kun je niet zelf terugdraaien.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 rounded-full"
                      onClick={() => setConfirmClose(false)}
                    >
                      Nee
                    </Button>
                    <Button
                      disabled={busy}
                      className="flex-1 rounded-full"
                      onClick={() => run(onCloseGroup)}
                    >
                      Ja, opheffen
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClose(true)}
                  className="text-sm text-destructive underline"
                >
                  Groep opheffen
                </button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
