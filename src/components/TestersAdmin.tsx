import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lastSeen, testItems, testProgress, testQuestions, type TesterRole } from "@/lib/test-checklist";

type Row = {
  user_id: string;
  role: string;
  checks: Record<string, boolean>;
  notes: Record<string, string>;
  started_at: string;
  updated_at: string;
};
const LINK = "app.ceritaproject.nl/testlijst";

/** Beheer → Testers: everyone's checklist live (refreshes every 15 seconds), with their answers. */
export function TestersAdmin() {
  const [filter, setFilter] = useState<"alle" | TesterRole>("alle");
  const [open, setOpen] = useState<string | null>(null);
  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["testers-admin"],
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("tester_progress")
        .select("user_id, role, checks, notes, started_at, updated_at")
        .order("updated_at", { ascending: false });
      if (error) return { installed: false, rows: [] as Row[], names: new Map<string, string>() };
      const ids = (rows ?? []).map((r) => r.user_id);
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id, display_name, username").in("id", ids)
        : { data: [] };
      const names = new Map(
        (profiles ?? []).map((p) => [p.id, `${p.display_name || "Zonder naam"}${p.username ? ` (@${p.username})` : ""}`]),
      );
      return { installed: true, rows: (rows ?? []) as Row[], names };
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Testers laden…</p>;
  if (!data?.installed)
    return (
      <p className="rounded-3xl bg-card p-4 text-sm shadow-soft">
        De testlijst is nog niet geïnstalleerd. Plak <b>supabase/update-56-testlijst.sql</b> in Supabase → SQL Editor en
        klik Run.
      </p>
    );

  const rows = data.rows.filter((r) => filter === "alle" || r.role === filter);
  const roleOf = (r: Row): TesterRole => (r.role === "ouder" ? "ouder" : "jongere");
  const stats = (role: TesterRole) => {
    const list = data.rows.filter((r) => roleOf(r) === role);
    const avg = list.length ? Math.round(list.reduce((a, r) => a + testProgress(role, r.checks).pct, 0) / list.length) : 0;
    const active = list.filter((r) => Date.now() - Date.parse(r.updated_at) < 86_400_000).length;
    return { count: list.length, avg, active };
  };
  const parents = stats("ouder");
  const youth = stats("jongere");

  return (
    <div className="space-y-4">
      <section className="space-y-2 rounded-3xl bg-card p-5 shadow-soft">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl">🧪 Testers</h2>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2 animate-pulse rounded-full bg-[#2d6a4f]" /> live ·{" "}
            {new Date(dataUpdatedAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Testers openen hun lijst via <b>{LINK}</b> (ingelogd). Ouders krijgen vanzelf de ouderlijst, jongeren de
          jongerenlijst. Dit overzicht ververst elke 15 seconden.
        </p>
        <button
          onClick={() =>
            void navigator.clipboard
              .writeText(`https://${LINK}`)
              .then(() => toast.success("Link gekopieerd"))
              .catch(() => toast.error("Kopiëren lukte niet"))
          }
          className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground"
        >
          <Copy className="size-3.5" /> Kopieer de link voor testers
        </button>
      </section>

      <div className="grid grid-cols-2 gap-3">
        {([["jongere", "🙋 Jongeren", youth], ["ouder", "👪 Ouders", parents]] as const).map(([role, label, s]) => (
          <button
            key={role}
            onClick={() => setFilter(filter === role ? "alle" : role)}
            aria-pressed={filter === role}
            className={`rounded-3xl p-4 text-left shadow-soft transition ${filter === role ? "bg-primary text-primary-foreground" : "bg-card"}`}
          >
            <span className="block text-sm font-semibold">{label}</span>
            <span className="block text-3xl font-bold tabular-nums">{s.count}</span>
            <span className="block text-xs opacity-80">
              gemiddeld {s.avg}% · {s.active} actief vandaag
            </span>
          </button>
        ))}
      </div>

      {rows.length === 0 && (
        <p className="rounded-3xl bg-card p-5 text-center text-sm text-muted-foreground shadow-soft">
          Nog niemand begonnen. Zodra een tester iets afvinkt, verschijnt die hier.
        </p>
      )}

      <div className="space-y-2">
        {rows.map((r) => {
          const role = roleOf(r);
          const p = testProgress(role, r.checks);
          const isOpen = open === r.user_id;
          const answered = testQuestions(role).filter((q) => (r.notes[q.id] ?? "").trim()).length;
          return (
            <article key={r.user_id} className="rounded-3xl bg-card p-4 shadow-soft">
              <button onClick={() => setOpen(isOpen ? null : r.user_id)} className="flex w-full items-center gap-3 text-left" aria-expanded={isOpen}>
                <span className="text-2xl">{role === "ouder" ? "👪" : "🙋"}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{data.names.get(r.user_id) ?? "Onbekend"}</span>
                  <span className="block text-xs text-muted-foreground">
                    {p.done}/{p.total} · bezig {lastSeen(r.updated_at)}
                    {answered ? ` · ${answered} ${answered === 1 ? "antwoord" : "antwoorden"} 💬` : ""}
                  </span>
                </span>
                <span className="text-sm font-bold tabular-nums">{p.pct}%</span>
                <ChevronDown className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              <div className="mt-2 grid grid-cols-4 gap-1" aria-hidden>
                {p.phases.map((ph) => (
                  <span key={ph.id} className="h-1.5 overflow-hidden rounded-full bg-muted" title={`${ph.title}: ${ph.done}/${ph.total}`}>
                    <span
                      className={`block h-full rounded-full ${ph.done === ph.total ? "bg-[#2d6a4f]" : "bg-primary"}`}
                      style={{ width: `${(ph.done / ph.total) * 100}%` }}
                    />
                  </span>
                ))}
              </div>
              {isOpen && (
                <div className="mt-3 space-y-3 text-sm">
                  <div className="space-y-1">
                    {p.phases.map((ph) => (
                      <p key={ph.id} className="text-xs">
                        <b>{ph.title}</b> · {ph.done} van {ph.total}
                      </p>
                    ))}
                  </div>
                  {testItems(role).some((i) => !r.checks[i.id]) && (
                    <div className="rounded-2xl bg-muted p-3">
                      <p className="text-xs font-semibold">Nog niet gedaan</p>
                      <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                        {testItems(role)
                          .filter((i) => !r.checks[i.id])
                          .map((i) => (
                            <li key={i.id}>{i.title}</li>
                          ))}
                      </ul>
                    </div>
                  )}
                  {testQuestions(role).map((q) => (
                    <div key={q.id}>
                      <p className="text-xs font-semibold">{q.question}</p>
                      <p className={`whitespace-pre-wrap ${(r.notes[q.id] ?? "").trim() ? "" : "text-xs text-muted-foreground"}`}>
                        {(r.notes[q.id] ?? "").trim() || "Nog niet ingevuld"}
                      </p>
                    </div>
                  ))}
                  <p className="text-[11px] text-muted-foreground">
                    Begonnen {new Date(r.started_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}
                  </p>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
