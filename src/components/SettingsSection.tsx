import { ChevronDown } from "lucide-react";

/** One fold-open group on the profile page: icon, title and a short line of what is set. */
export function SettingsSection({
  id,
  emoji,
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  id: string;
  emoji: string;
  title: string;
  summary?: string | undefined;
  open: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <section
      id={`instelling-${id}`}
      className="scroll-mt-20 overflow-hidden rounded-3xl bg-card shadow-soft"
    >
      <button
        onClick={() => onToggle(id)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left active:bg-muted/50"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-secondary text-xl">
          {emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{title}</span>
          {summary && (
            <span className="block truncate text-xs text-muted-foreground">{summary}</span>
          )}
        </span>
        <ChevronDown
          className={`size-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="space-y-4 border-t border-border/40 p-4 animate-in fade-in slide-in-from-top-1">
          {children}
        </div>
      )}
    </section>
  );
}
