import { Link } from "@tanstack/react-router";
import { testPath, testProgress } from "@/lib/test-checklist";
import { useMyTesterRow } from "@/lib/use-tester";

/** For testers only (once they opened their list): a shortcut back to it with their progress. */
export function TesterCard({ uid }: { uid: string | undefined }) {
  const { data } = useMyTesterRow(uid);
  const row = data?.row;
  if (!row) return null;
  const role = row.role === "ouder" ? "ouder" : "jongere";
  const p = testProgress(role, row.checks ?? {});
  return (
    <Link to={testPath(role)} className="flex items-center gap-3 rounded-3xl border-2 border-dashed border-primary bg-card p-4 shadow-soft transition active:scale-[0.99]">
      <span className="text-2xl">🧪</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{p.done === p.total ? "Testlijst klaar 🎉" : "Jouw testlijst"}</span>
        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted">
          <span className="block h-full rounded-full bg-primary" style={{ width: `${p.pct}%` }} />
        </span>
      </span>
      <span className="text-sm font-bold tabular-nums">
        {p.done}/{p.total}
      </span>
    </Link>
  );
}
