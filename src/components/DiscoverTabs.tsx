import { Link } from "@tanstack/react-router";

type Tab = "verhaal" | "artikel" | "luisteren";

/** Tabs at the top of Ontdekken: stories, articles and things to listen to or watch. */
export function DiscoverTabs({
  active,
  counts,
  onSelect,
}: {
  active: Tab;
  counts?: Partial<Record<Tab, number>>;
  onSelect?: () => void;
}) {
  const cls = (t: Tab) =>
    `rounded-full px-1 py-2 text-center text-[13px] font-semibold transition-colors ${active === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`;
  const n = (t: Tab) => (counts?.[t] != null ? ` ${counts[t]}` : "");
  return (
    <div className="mt-4 grid grid-cols-3 gap-1 rounded-full bg-card p-1 shadow-soft">
      <Link to="/ontdekken" search={{}} onClick={onSelect} className={cls("verhaal")}>
        📖 Verhalen{n("verhaal")}
      </Link>
      <Link
        to="/ontdekken"
        search={{ soort: "artikelen" }}
        onClick={onSelect}
        className={cls("artikel")}
      >
        📰 Artikelen{n("artikel")}
      </Link>
      <Link to="/luisteren" onClick={onSelect} className={cls("luisteren")}>
        🎧 Luisteren{n("luisteren")}
      </Link>
    </div>
  );
}
