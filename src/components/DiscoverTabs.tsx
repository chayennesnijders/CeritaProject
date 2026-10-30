import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";

type Tab = "verhaal" | "artikel" | "luisteren" | "muziek";

/** Tabs at the top of Ontdekken: stories, articles, things to listen to or watch and music. */
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
    `shrink-0 rounded-full px-3 py-2 text-center text-[13px] font-semibold transition-colors ${active === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`;
  const bar = useRef<HTMLDivElement>(null);
  // The tabs scroll sideways on a phone: keep the open one in view.
  useEffect(() => {
    const el = bar.current?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    const box = bar.current;
    if (el && box) box.scrollLeft = el.offsetLeft - (box.clientWidth - el.clientWidth) / 2;
  }, [active]);
  const n = (t: Tab) => (counts?.[t] != null ? ` ${counts[t]}` : "");
  return (
    <div
      ref={bar}
      className="mt-4 flex gap-1 overflow-x-auto rounded-full bg-card p-1 shadow-soft [scrollbar-width:none]"
    >
      <Link
        to="/ontdekken"
        search={{}}
        onClick={onSelect}
        data-tab="verhaal"
        className={cls("verhaal")}
      >
        📖 Verhalen{n("verhaal")}
      </Link>
      <Link
        to="/ontdekken"
        search={{ soort: "artikelen" }}
        onClick={onSelect}
        data-tab="artikel"
        className={cls("artikel")}
      >
        📰 Artikelen{n("artikel")}
      </Link>
      <Link to="/luisteren" onClick={onSelect} data-tab="luisteren" className={cls("luisteren")}>
        🎧 Luisteren{n("luisteren")}
      </Link>
      <Link to="/muziek" onClick={onSelect} data-tab="muziek" className={cls("muziek")}>
        🎵 Muziek
      </Link>
    </div>
  );
}
