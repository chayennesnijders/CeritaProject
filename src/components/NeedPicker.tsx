import { NEEDS, needById, type NeedId } from "@/lib/needs";

/** Optional chips above the message box: what would you like from others? Tap again to undo. */
export function NeedPicker({
  value,
  onChange,
}: {
  value: NeedId | null;
  onChange: (need: NeedId | null) => void;
}) {
  return (
    <div className="mb-2">
      <p className="mb-1 px-1 text-[11px] font-semibold text-muted-foreground">
        Wat heb je nodig? <span className="font-normal">(mag je overslaan)</span>
      </p>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {NEEDS.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => onChange(value === n.id ? null : n.id)}
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${value === n.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            {n.emoji} {n.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The label on a message; others also see a tip on how to reply. */
export function NeedBadge({ need, mine }: { need: string | null | undefined; mine: boolean }) {
  const n = needById(need);
  if (!n) return null;
  return (
    <div className="mb-1">
      <span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
        {n.emoji} {n.label}
      </span>
      {!mine && <p className="mt-0.5 text-[11px] leading-snug opacity-75">{n.hint}</p>}
    </div>
  );
}
