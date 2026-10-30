import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ritiImage, type RitiExpression } from "@/lib/riti";
import { STICKERS, stickerById, type StickerId } from "@/lib/stickers";

/**
 * Riti in a round sticker frame. The Riti pictures are cut off straight at the bottom, so the bottom
 * of the picture fades out and the circle hides the rest.
 */
function StickerFace({ expression, size }: { expression: RitiExpression; size: number }) {
  return (
    <span
      className="relative block shrink-0 overflow-hidden rounded-full border-4 border-[#f7c6d0] bg-white shadow-soft"
      style={{ width: size, height: size }}
    >
      <img
        src={ritiImage(expression)}
        alt=""
        className="absolute left-1/2 top-[7%] max-w-none -translate-x-1/2"
        style={{
          width: size * 0.74,
          // The picture ends in a straight line at the bottom: let it fade out softly instead.
          maskImage: "linear-gradient(to bottom, black 78%, transparent 97%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 78%, transparent 97%)",
        }}
      />
    </span>
  );
}

/** A Riti sticker as it shows in the chat. */
export function StickerView({ id }: { id: string }) {
  const s = stickerById(id);
  if (!s) return null;
  return (
    <div className="flex flex-col items-center">
      <span role="img" aria-label={`Riti: ${s.text}`}>
        <StickerFace expression={s.expression} size={112} />
      </span>
      <span className="relative -mt-3 rounded-full bg-card px-3 py-0.5 text-sm font-bold text-foreground shadow-soft">
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
                <StickerFace expression={s.expression} size={60} />
                <span className="text-[10px] font-bold leading-tight">{s.text}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
