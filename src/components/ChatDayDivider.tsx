// Datumkop tussen de chatberichten: "Vandaag", "Gisteren" of de volle dag.
export function ChatDayDivider({ label }: { label: string }) {
  return (
    <p className="flex justify-center py-1">
      <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-semibold text-muted-foreground">{label}</span>
    </p>
  );
}
