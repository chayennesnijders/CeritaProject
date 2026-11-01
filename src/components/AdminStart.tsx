import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_PAGES, visibleGroups, type AdminPage } from "@/lib/admin-nav";

type Tile = { page: AdminPage; emoji: string; label: string; count: number; urgent?: boolean };

/** Count rows quickly (head request); 0 when the table isn't there yet or can't be read. */
async function count(q: PromiseLike<{ count: number | null; error: unknown }>) {
  const { count: n, error } = await q;
  return error ? 0 : (n ?? 0);
}

/**
 * Beheer → Start: in one glance what needs attention today, and below it every page of Beheer in
 * four groups. Tapping a tile or a page opens it.
 */
export function AdminStart({
  openReports,
  newsUnread,
  canSee,
  onOpen,
}: {
  openReports: number;
  newsUnread: number;
  canSee: (page: AdminPage) => boolean;
  onOpen: (page: AdminPage) => void;
}) {
  const { data } = useQuery({
    queryKey: ["admin-start"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const week = new Date(Date.now() - 7 * 86400000).toISOString();
      const [alerts, memberMsgs, contact, questions, stories, members, waitlist, waitWeek] =
        await Promise.all([
          count(
            supabase
              .from("safety_alerts")
              .select("id", { count: "exact", head: true })
              .eq("status", "open"),
          ),
          count(
            supabase
              .from("admin_messages")
              .select("id", { count: "exact", head: true })
              .eq("status", "nieuw"),
          ),
          count(
            supabase
              .from("public_messages")
              .select("id", { count: "exact", head: true })
              .eq("status", "nieuw"),
          ),
          count(
            supabase
              .from("anon_questions")
              .select("id", { count: "exact", head: true })
              .eq("status", "nieuw"),
          ),
          count(
            supabase
              .from("story_submissions")
              .select("id", { count: "exact", head: true })
              .eq("status", "nieuw"),
          ),
          count(
            supabase
              .from("profiles")
              .select("id", { count: "exact", head: true })
              .gte("created_at", week),
          ),
          count(supabase.from("waitlist").select("id", { count: "exact", head: true })),
          count(
            supabase
              .from("waitlist")
              .select("id", { count: "exact", head: true })
              .gte("created_at", week),
          ),
        ]);
      return { alerts, memberMsgs, contact, questions, stories, members, waitlist, waitWeek };
    },
  });
  const d = data ?? {
    alerts: 0,
    memberMsgs: 0,
    contact: 0,
    questions: 0,
    stories: 0,
    members: 0,
    waitlist: 0,
    waitWeek: 0,
  };

  const todo: Tile[] = [
    { page: "inbox", emoji: "🚩", label: "Open meldingen", count: openReports, urgent: true },
    { page: "inbox", emoji: "🆘", label: "Zorgsignalen", count: d.alerts, urgent: true },
    { page: "berichten", emoji: "💌", label: "Berichten van leden", count: d.memberMsgs },
    { page: "berichten", emoji: "✉️", label: "Contactformulier", count: d.contact },
    { page: "vragen", emoji: "❓", label: "Anonieme vragen", count: d.questions },
    { page: "verhalen", emoji: "📖", label: "Ingestuurde verhalen", count: d.stories },
    { page: "nieuws", emoji: "📰", label: "Nieuws", count: newsUnread },
  ];
  const shownTodo = todo.filter((t) => canSee(t.page));
  const waiting = shownTodo.filter((t) => t.count > 0);

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h2 className="text-lg">Vandaag</h2>
        {waiting.length === 0 ? (
          <p className="rounded-3xl bg-[#d8f3dc] p-4 text-sm font-semibold text-[#1b4332]">
            ✅ Alles is bijgewerkt. Er wacht niets op je.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {waiting.map((t) => (
              <button
                key={t.label}
                onClick={() => onOpen(t.page)}
                className={`rounded-2xl p-3 text-left shadow-soft active:scale-[.98] ${t.urgent ? "bg-secondary text-secondary-foreground ring-2 ring-primary" : "bg-card"}`}
              >
                <span className="block text-2xl font-bold leading-tight">
                  {t.emoji} {t.count}
                </span>
                <span className="block text-[11px] font-semibold leading-tight">{t.label}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {canSee("overzicht") && (
        <section className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onOpen("overzicht")}
            className="rounded-2xl bg-card p-3 text-left shadow-soft"
          >
            <span className="block text-2xl font-bold">{d.waitlist}</span>
            <span className="text-sm">📝 op de wachtlijst</span>
            {d.waitWeek > 0 && (
              <span className="block text-xs text-muted-foreground">+{d.waitWeek} deze week</span>
            )}
          </button>
          <button
            onClick={() => onOpen("overzicht")}
            className="rounded-2xl bg-card p-3 text-left shadow-soft"
          >
            <span className="block text-2xl font-bold">{d.members}</span>
            <span className="text-sm">🙋 nieuwe leden</span>
            <span className="block text-xs text-muted-foreground">afgelopen 7 dagen</span>
          </button>
        </section>
      )}

      {visibleGroups(canSee).map((g) => (
        <section key={g.title} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {g.title}
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {g.pages.map((p) => (
              <button
                key={p}
                onClick={() => onOpen(p)}
                className="flex items-center gap-2 rounded-2xl bg-card px-3 py-2.5 text-left text-sm font-semibold leading-tight shadow-soft active:scale-[.98]"
              >
                <span className="text-lg">{ADMIN_PAGES[p].emoji}</span>
                {ADMIN_PAGES[p].label}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
