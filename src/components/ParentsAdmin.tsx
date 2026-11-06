import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { challengeDay } from "@/lib/challenges";
import { GUIDES, GUIDES_SOON } from "@/lib/guides";
import { PARENT_FOR_CHILD, PARENT_SELF } from "@/lib/parent";
import { THEME_DAYS } from "@/lib/theme-days";

type GuideStat = { guide: string; started: number; completed: number; goed: number; lastig: number; niet: number };
type Stats = {
  parents: number;
  parents_new_7_days: number;
  young_parents: number;
  active_7_days: number;
  tasks_7_days: { zelf: number; kind: number };
  guides: GuideStat[];
};

const SIGNUP_TEXT =
  "Ben je ouder of verzorger van een jongere? Op CeritaProject is er een eigen plek voor jou: elke dag een klein opdrachtje voor jezelf en een tip voor je kind, en handleidingen voor lastige gesprekken. Je ziet nooit iets van jongeren. Maak een account op app.ceritaproject.nl en kies ‘Ik ben ouder of verzorger’.";

/** Beheer → Ouderportaal: how the parents' environment is used (counts only), what's in it, and a preview. */
export function ParentsAdmin() {
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ["parent-portal-stats"],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("parent_portal_stats");
      if (error) throw error;
      return data as unknown as Stats;
    },
  });
  const today = challengeDay();
  const upcoming = THEME_DAYS.filter((t) => (t.to ?? t.from) >= today).slice(0, 4);
  const guideTitle = (slug: string) => GUIDES.find((g) => g.slug === slug);

  return (
    <div className="space-y-5">
      <section className="space-y-2 rounded-3xl bg-card p-5 shadow-soft">
        <h2 className="text-xl">👪 Ouderportaal</h2>
        <p className="text-sm text-muted-foreground">
          Ouders en verzorgers hebben een eigen omgeving: een dagopdracht voor zichzelf, een tip voor hun kind,
          stemming, rust, themadagen en handleidingen. Ze zien nooit groepen, chats of profielen van jongeren. Jij ziet
          hier alleen aantallen, nooit wie wat deed.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            to="/ouderportaal-voorbeeld"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            👀 Bekijk als ouder
          </Link>
          <Link to="/handleidingen" className="rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground">
            📘 Handleidingen
          </Link>
          <a href="/ouders" target="_blank" rel="noreferrer" className="rounded-full border px-4 py-2 text-sm font-semibold">
            Infopagina voor ouders ↗
          </a>
        </div>
      </section>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cijfers laden…</p>
      ) : isError || !stats ? (
        <p className="rounded-3xl bg-card p-4 text-sm shadow-soft">
          De cijfers zijn nog niet beschikbaar. Plak <b>supabase/update-53-ouderportaal-beheer.sql</b> in Supabase → SQL
          Editor en klik Run.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Tile value={stats.parents} label="Ouder-accounts" sub={`+${stats.parents_new_7_days} deze week`} />
            <Tile value={stats.active_7_days} label="Actief deze week" sub="deden een dagopdracht" />
            <Tile value={stats.tasks_7_days.zelf} label="Opdrachten voor zichzelf" sub="afgelopen 7 dagen" />
            <Tile value={stats.tasks_7_days.kind} label="Tips voor hun kind" sub="afgelopen 7 dagen" />
          </div>
          <p className="text-xs text-muted-foreground">
            👶 {stats.young_parents} jonge {stats.young_parents === 1 ? "ouder" : "ouders"} (13–27) gebruikt de ouderhoek
            naast de eigen groepen.
          </p>

          <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
            <h3 className="font-semibold">📘 Handleidingen</h3>
            {GUIDES.map((g) => {
              const s = stats.guides.find((x) => x.guide === g.slug);
              const pct = s && s.started ? Math.round((s.completed / s.started) * 100) : 0;
              const answered = s ? s.goed + s.lastig + s.niet : 0;
              return (
                <div key={g.slug} className="space-y-1 border-b pb-3 last:border-0 last:pb-0">
                  <p className="text-sm font-semibold">
                    {g.emoji} {g.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s ? `${s.started} gestart · ${s.completed} afgerond (${pct}%)` : "Nog door niemand gestart"}
                  </p>
                  {s && s.started > 0 && (
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  {answered > 0 && (
                    <p className="text-xs">
                      Hoe ging het plan? 😊 {s!.goed} goed · 😕 {s!.lastig} lastig · ⏳ {s!.niet} nog niet
                    </p>
                  )}
                </div>
              );
            })}
            {stats.guides
              .filter((s) => !guideTitle(s.guide))
              .map((s) => (
                <p key={s.guide} className="text-xs text-muted-foreground">
                  Oude handleiding “{s.guide}”: {s.started} gestart
                </p>
              ))}
            <p className="text-xs text-muted-foreground">
              Binnenkort: {GUIDES_SOON.map((g) => g.title).join(", ")}.
            </p>
          </section>
        </>
      )}

      <section className="space-y-2 rounded-3xl bg-card p-5 shadow-soft">
        <h3 className="font-semibold">📅 Komende themadagen voor ouders</h3>
        {upcoming.length === 0 && <p className="text-sm text-muted-foreground">Geen themadagen gepland.</p>}
        {upcoming.map((t) => (
          <div key={t.title + t.from} className="text-sm">
            <p className="font-semibold">
              {t.emoji} {t.title}{" "}
              <span className="font-normal text-muted-foreground">
                · {new Date(`${t.from}T12:00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}
              </span>
            </p>
            {t.ouders && <p className="text-xs text-muted-foreground">Tip voor ouders: {t.ouders}</p>}
          </div>
        ))}
      </section>

      <section className="space-y-2 rounded-3xl bg-card p-5 text-sm shadow-soft">
        <h3 className="font-semibold">📦 Wat er in het portaal staat</h3>
        <p>
          {PARENT_SELF.length} dagopdrachten voor ouders zelf en {PARENT_FOR_CHILD.length} tips voor hun kind (wisselen
          elke dag om 00:00), {GUIDES.length} handleidingen, stemming, rustmoment, dankbaar potje en hulpnummers.
        </p>
      </section>

      <section className="space-y-2 rounded-3xl bg-secondary p-5 text-sm text-secondary-foreground">
        <h3 className="font-semibold">📣 Ouders uitnodigen</h3>
        <p>Ouders maken een gewoon account en kiezen bij hun geboortedatum: ‘Ik ben ouder of verzorger’.</p>
        <p className="rounded-2xl bg-card p-3 text-xs text-foreground">{SIGNUP_TEXT}</p>
        <button
          onClick={() =>
            void navigator.clipboard
              .writeText(SIGNUP_TEXT)
              .then(() => toast.success("Gekopieerd"))
              .catch(() => toast.error("Kopiëren lukte niet"))
          }
          className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-foreground"
        >
          <Copy className="size-3.5" /> Kopieer tekst
        </button>
      </section>
    </div>
  );
}

function Tile({ value, label, sub }: { value: number; label: string; sub: string }) {
  return (
    <div className="rounded-3xl bg-card p-4 shadow-soft">
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
