import { HELP_LINES } from "@/lib/legal";

/** Free help numbers in the Netherlands; tap to call or open the website. */
export function HelpLines({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-2">
      {HELP_LINES.map((h) => (
        <div key={h.name} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-soft">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{h.name}</p>
            {!compact && <p className="text-xs text-muted-foreground">{h.what}</p>}
          </div>
          <a
            href={`tel:${h.phone.replace(/-/g, "")}`}
            className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground"
          >
            📞 {h.phone}
          </a>
          {h.href.startsWith("http") && !compact && (
            <a
              href={h.href}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-xs text-primary underline"
            >
              chat
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
