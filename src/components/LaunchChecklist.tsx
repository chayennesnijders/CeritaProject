import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getLaunchChecks } from "@/lib/push.functions";
import { ORG } from "@/lib/legal";
import { launchChecks, launchStatus, type LaunchCheck } from "@/lib/launch";

const env = import.meta.env as Record<string, string | undefined>;

/** The checklist with its status, shared by the Livegang tab and the banner in Nieuws. */
export function useLaunchChecks() {
  const fetchChecks = useServerFn(getLaunchChecks);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["launch-checks"],
    queryFn: () => fetchChecks(),
    staleTime: 60_000,
  });
  const checks = data
    ? launchChecks(data, {
        firebaseClient: [
          "VITE_FIREBASE_API_KEY",
          "VITE_FIREBASE_PROJECT_ID",
          "VITE_FIREBASE_APP_ID",
          "VITE_FIREBASE_VAPID_KEY",
        ].every((k) => !!env[k]),
        stripeLiveClient: (env["VITE_STRIPE_PUBLISHABLE_KEY"] ?? "").startsWith("pk_live_"),
        host: typeof window === "undefined" ? "" : window.location.host,
        kvk: !!ORG.kvk,
      })
    : [];
  return { checks, status: launchStatus(checks), isLoading, refetch, isFetching };
}

/** Small line at the top of Nieuws: how far along going live is. */
export function LaunchBanner({ onOpen }: { onOpen: () => void }) {
  const { checks, status } = useLaunchChecks();
  if (!checks.length) return null;
  return (
    <button
      onClick={onOpen}
      className={`flex w-full items-center gap-3 rounded-3xl p-4 text-left shadow-soft ${status.ready ? "bg-[#d8f3dc] text-[#1b4332]" : "bg-secondary text-secondary-foreground"}`}
    >
      <span className="text-2xl">{status.ready ? "🚀" : "🛠️"}</span>
      <span className="flex-1">
        <span className="block font-semibold">
          {status.ready
            ? "Klaar om live te gaan!"
            : `Livegang: ${status.done} van ${status.total} klaar`}
        </span>
        <span className="block text-xs opacity-80">
          {status.ready
            ? "Alles wat nodig is staat klaar. Tik voor de puntjes op de i."
            : "Tik om te zien wat er nog moet gebeuren."}
        </span>
      </span>
      <span>→</span>
    </button>
  );
}

function Row({ c }: { c: LaunchCheck }) {
  const icon = c.ok === true ? "✅" : c.ok === null ? "📝" : c.required ? "❌" : "⚪";
  return (
    <div className="flex gap-3 rounded-2xl bg-muted p-3">
      <span className="text-lg">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {c.label}
          {!c.required && c.ok !== true && (
            <span className="ml-1 text-[11px] font-normal text-muted-foreground">(mag later)</span>
          )}
        </p>
        {c.ok !== true && <p className="text-xs text-muted-foreground">{c.how}</p>}
      </div>
    </div>
  );
}

/** Beheer → Livegang: checks itself what is ready for going live and what still needs doing. */
export function LaunchChecklist() {
  const { checks, status, isLoading, refetch, isFetching } = useLaunchChecks();
  if (isLoading) return <p className="text-sm text-muted-foreground">Even controleren…</p>;
  if (!checks.length)
    return (
      <p className="text-sm text-destructive">Controleren lukte niet. Probeer het later opnieuw.</p>
    );
  const groups = [...new Set(checks.map((c) => c.group))];
  return (
    <div className="space-y-4">
      <section
        className={`rounded-3xl p-5 text-center shadow-soft ${status.ready ? "bg-[#d8f3dc] text-[#1b4332]" : "bg-card"}`}
      >
        <p className="text-5xl">{status.ready ? "🚀" : "🛠️"}</p>
        <p className="mt-2 font-display text-2xl">
          {status.ready ? "Klaar om live te gaan!" : "Nog niet helemaal klaar"}
        </p>
        <p className="mt-1 text-sm opacity-80">
          {status.done} van de {status.total} dingen die nodig zijn, zijn klaar.
        </p>
        <div className="mx-auto mt-3 h-3 max-w-xs overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(status.done / status.total) * 100}%` }}
          />
        </div>
        <button onClick={() => refetch()} className="mt-3 text-xs underline">
          {isFetching ? "Controleren…" : "Opnieuw controleren"}
        </button>
      </section>
      {groups.map((g) => (
        <section key={g} className="space-y-2 rounded-3xl bg-card p-4 shadow-soft">
          <h2 className="text-lg">{g}</h2>
          {checks
            .filter((c) => c.group === g)
            .map((c) => (
              <Row key={c.id} c={c} />
            ))}
        </section>
      ))}
      <p className="text-center text-xs text-muted-foreground">
        ✅ klaar · ❌ nodig voor livegang · ⚪ mag later · 📝 zelf afvinken in je hoofd 😉
      </p>
    </div>
  );
}
