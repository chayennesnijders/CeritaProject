import { useState } from "react";
import { Gamepad2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CHAT_GAMES, type ChatGameId } from "@/lib/chat-games";

/** 🎮 button next to the message field: pick a game to play in this chat. */
export function GamePicker({
  onPick,
  disabled,
  inGroup,
}: {
  onPick: (game: ChatGameId) => Promise<void> | void;
  disabled?: boolean;
  inGroup?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-1.5 rounded-full bg-muted px-3 text-xs font-semibold disabled:opacity-50"
      >
        <Gamepad2 className="size-4" /> Spelletje
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>🎮 Speel een spelletje</DialogTitle>
            <DialogDescription>
              {inGroup
                ? "Iedereen in de groep ziet het. Wie als eerste op ‘Doe mee’ tikt, speelt tegen je."
                : "Je daagt de ander uit. Jij mag beginnen!"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(CHAT_GAMES) as ChatGameId[]).map((id) => {
              const g = CHAT_GAMES[id];
              return (
                <button
                  key={id}
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await onPick(id);
                      setOpen(false);
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="flex flex-col items-center gap-1 rounded-2xl bg-muted p-4 text-center active:scale-95 disabled:opacity-50"
                >
                  <span className="text-4xl">{g.emoji}</span>
                  <span className="text-sm font-semibold">{g.name}</span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
