import { useState } from "react";
import { quickReplies } from "@/lib/quick-replies";

/** "🤍 Snel reageren" under someone else's message: tap a kind sentence to reply with it. */
export function QuickReplies({
  need,
  onSend,
}: {
  need: string | null | undefined;
  onSend: (text: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
      >
        🤍 Snel reageren
      </button>
    );
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {quickReplies(need).map((t) => (
        <button
          key={t}
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const ok = await onSend(t);
            setBusy(false);
            if (ok) setOpen(false);
          }}
          className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground active:scale-95 disabled:opacity-50"
        >
          {t}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="px-1 text-[11px] text-muted-foreground"
      >
        sluiten
      </button>
    </div>
  );
}
