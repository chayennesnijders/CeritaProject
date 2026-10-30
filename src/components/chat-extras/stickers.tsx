import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ritiImage } from "@/lib/riti";
import { STICKERS, stickerById, type StickerId } from "@/lib/stickers";

/** A Riti sticker as it shows in the chat. */
export function StickerView({ id }: { id: string }) {
  const s = stickerById(id);
  if (!s) return null;
  return (
    <div className="flex flex-col items-center">
      <img
        src={ritiImage(s.expression)}
        alt={`Riti: ${s.text}`}
        className="size-28 object-contain drop-shadow"
      />
      <span className="-mt-2 rounded-full bg-card px-3 py-0.5 text-sm font-bold text-foreground shadow-soft">
        {s.text}
      </span>
    </div>
  );
}

/** 🧸 button: pick a Riti sticker to send. */
export function StickerPicker({
  onPick,
  disabled,
}: {
  onPick: (id: StickerId) => Promise<void> | void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-1.5 rounded-full bg-muted px-3 text-xs font-semibold disabled:opacity-50"
      >
        🧸 Sticker
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>🧸 Stuur een Riti-sticker</DialogTitle>
            <DialogDescription>Tik op een sticker om hem meteen te sturen.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2">
            {STICKERS.map((s) => (
              <button
                key={s.id}
                onClick={async () => {
                  setOpen(false);
                  await onPick(s.id);
                }}
                className="flex flex-col items-center rounded-2xl bg-muted p-1.5 active:scale-95"
              >
                <img src={ritiImage(s.expression)} alt="" className="size-14 object-contain" />
                <span className="text-[10px] font-bold leading-tight">{s.text}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
