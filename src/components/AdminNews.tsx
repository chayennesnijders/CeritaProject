import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { enablePush, pushMessage } from "@/lib/push-client";
import { setAdminNewsPush } from "@/lib/push.functions";
import { dayLabel, isNew, NEWS_KINDS, newsCounts, newsKind, type NewsKind } from "@/lib/admin-news";
import { useAdminNews } from "@/lib/use-admin-news";

/** Dashboard with everything that happened: new members, orders, submitted stories and reports. */
export function AdminNews({ uid, onOpenTab }: { uid: string; onOpenTab: (tab: string) => void }) {
  const { items, seenAt, isLoading, markSeen, push, refreshSeen } = useAdminNews(uid);
  const savePush = useServerFn(setAdminNewsPush);
  const [pushBusy, setPushBusy] = useState(false);
  async function togglePush(on: boolean) {
    setPushBusy(true);
    try {
      if (on) {
        // This device must be able to receive pushes first.
        const r = await enablePush(uid);
        if (r !== "registered") {
          toast.error(pushMessage(r));
          return;
        }
      }
      await savePush({ data: { on, origin: window.location.origin } });
      toast.success(
        on ? "Je krijgt nu een pushmelding bij nieuws 📲" : "Pushmeldingen voor nieuws staan uit",
      );
      refreshSeen();
    } catch {
      toast.error("Dat lukte niet. Probeer het opnieuw.");
    } finally {
      setPushBusy(false);
    }
  }
  const [filter, setFilter] = useState<NewsKind | null>(null);
  // Keep showing what was new when you opened Nieuws, then remember that you looked.
  const lastVisit = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (isLoading || lastVisit.current !== undefined) return;
    lastVisit.current = seenAt;
    markSeen();
  }, [isLoading, seenAt, markSeen]);
  const before = lastVisit.current === undefined ? seenAt : lastVisit.current;

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const counts = newsCounts(items, weekAgo);
  const shown = items.filter((i) => !filter || i.kind === filter);
  const fresh = items.filter((i) => isNew(i, before)).length;
  let lastDay = "";

  return (
    <section className="space-y-4">
      <div className="rounded-3xl bg-warm p-5 text-blush shadow-soft">
        <p className="text-xs uppercase tracking-widest opacity-75">Nieuws</p>
        <p className="mt-1 font-display text-2xl">
          {fresh === 0
            ? "Je bent helemaal bij ✨"
            : `${fresh} ${fresh === 1 ? "nieuw bericht" : "nieuwe berichten"} sinds je laatste bezoek`}
        </p>
      </div>

      <label className="flex items-center gap-3 rounded-3xl bg-card p-4 shadow-soft">
        <span className="text-2xl">📲</span>
        <span className="flex-1">
          <span className="block text-sm font-semibold">Pushmelding bij nieuws</span>
          <span className="block text-xs text-muted-foreground">
            Nieuwe leden, bestellingen, verhalen en meldingen. Hooguit één melding per 5 minuten.
          </span>
        </span>
        <Switch
          checked={push}
          disabled={pushBusy}
          onCheckedChange={togglePush}
          aria-label="Pushmelding bij nieuws"
        />
      </label>

      <div>
        <p className="text-xs font-semibold text-muted-foreground">
          Afgelopen 7 dagen · tik om te filteren
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(Object.keys(NEWS_KINDS) as NewsKind[])
            .filter((k) => k === "aanmelding" || k === "verhaal" || items.some((i) => i.kind === k))
            .map((k) => (
              <button
                key={k}
                onClick={() => setFilter(filter === k ? null : k)}
                className={`rounded-3xl p-4 text-left shadow-soft transition active:scale-95 ${filter === k ? "bg-primary text-primary-foreground" : "bg-card"}`}
              >
                <span className="text-2xl">{NEWS_KINDS[k].emoji}</span>
                <span className="mt-1 block font-display text-3xl leading-none">
                  {counts[k] ?? 0}
                </span>
                <span className="text-xs font-semibold opacity-80">{NEWS_KINDS[k].label}</span>
              </button>
            ))}
        </div>
      </div>

      <div className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Laden…</p>}
        {!isLoading && shown.length === 0 && (
          <p className="rounded-3xl bg-card p-5 text-center text-sm text-muted-foreground shadow-soft">
            Nog niets gebeurd in de afgelopen 30 dagen.
          </p>
        )}
        {shown.map((i) => {
          const k = newsKind(i.kind);
          const day = dayLabel(i.created_at);
          const header = day !== lastDay ? day : null;
          lastDay = day;
          return (
            <div key={`${i.kind}-${i.ref_id}`}>
              {header && (
                <p className="mt-3 text-xs font-semibold first-letter:uppercase text-muted-foreground">
                  {header}
                </p>
              )}
              <button
                onClick={() => onOpenTab(k.tab)}
                className="mt-2 flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left shadow-soft active:scale-[0.99]"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-xl">
                  {k.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {k.label} ·{" "}
                    {new Date(i.created_at).toLocaleTimeString("nl-NL", {
                      timeZone: "Europe/Amsterdam",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="block truncate text-sm font-semibold">{i.title}</span>
                  {i.detail && (
                    <span className="block truncate text-xs text-muted-foreground">{i.detail}</span>
                  )}
                </span>
                {isNew(i, before) && (
                  <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                    Nieuw
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
