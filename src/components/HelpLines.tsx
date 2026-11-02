import { Link } from "@tanstack/react-router";
import { HELP_LINES } from "@/lib/legal";

/** Free help numbers in the Netherlands; tap to call or open the website. Below them, the
 * CeritaProject coaches (not for emergencies, so after the crisis lines). */
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
      <Link
        to="/coach"
        className="flex items-center gap-3 rounded-2xl border-2 border-primary/40 bg-card p-3 shadow-soft"
      >
        <span className="text-2xl">🎓</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Coaches van CeritaProject</span>
          {!compact && (
            <span className="block text-xs text-muted-foreground">
              Ervaren coaches die naar je luisteren, in de app. Chat met ze of stel anoniem een
              vraag. Geen spoedhulp: bij gevaar bel je 113 of 112.
            </span>
          )}
        </span>
        <span className="shrink-0 rounded-full bg-secondary px-3 py-1.5 text-sm font-bold text-secondary-foreground">
          💬 Chat
        </span>
      </Link>
    </div>
  );
}
