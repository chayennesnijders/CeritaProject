/**
 * What testers fill in (Beheer → Testers shows it live): parents answer PARENT_FORM at /testlijst,
 * young people TEST_FORM at /testen (src/lib/test-week.ts); progress means questions answered.
 * Question ids are stable, so answers survive text changes.
 */
import { answeredCount, PARENT_FORM, TEST_FORM, type TestFormQuestion } from "@/lib/test-week";

export type TesterRole = "ouder" | "jongere";
export type TestItem = { id: string; title: string; hint: string };
export type TestPhase = { id: string; title: string; when: string; items: TestItem[] };
export type TestQuestion = { id: string; question: string; placeholder: string };

/** Both parents and young people only answer questions now; no checklist to tick. */
export const testForm = (role: TesterRole) => (role === "ouder" ? PARENT_FORM : TEST_FORM);
const asQuestions = (form: readonly TestFormQuestion[]): TestQuestion[] =>
  form.map((q) => ({ id: q.id, question: q.label, placeholder: q.kind === "text" ? q.placeholder : "" }));


/** Where a tester ticks their list. */
export const testPath = (role: TesterRole) => (role === "ouder" ? "/testlijst" : "/testen");

/** Testers have no checklist any more, only questions (kept as a type for older rows). */
export const testPhases = (_role: TesterRole): TestPhase[] => [];
export const testQuestions = (role: TesterRole) => asQuestions(testForm(role));
export const testItems = (role: TesterRole) => testPhases(role).flatMap((p) => p.items);

/** Progress: the questions answered (ticks from the older parents' checklist no longer count). */
export function testProgress(
  role: TesterRole,
  checks: Record<string, boolean | undefined>,
  notes: Record<string, string> = {},
) {
  void checks;
  const form = testForm(role);
  const done = answeredCount(notes, form);
  const total = form.length;
  return {
    phases: [{ id: "vragen", title: "Vragen beantwoord", done, total }],
    done,
    total,
    pct: Math.round((done / total) * 100),
  };
}

/** "net", "3 uur geleden", "2 dagen geleden": how long ago a tester was last busy. */
export function lastSeen(iso: string, now = Date.now()): string {
  const min = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (min < 2) return "net";
  if (min < 60) return `${min} min geleden`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} uur geleden`;
  const d = Math.round(h / 24);
  return d === 1 ? "gisteren" : `${d} dagen geleden`;
}

/**
 * All test answers as one plain text, without names (testers get a number), to read or share
 * elsewhere. Earlier feedback that was only sent as a message is added at the end.
 */
export function feedbackExport(
  rows: readonly { role: string; checks: Record<string, boolean>; notes: Record<string, string> }[],
  messages: readonly string[] = [],
): string {
  const out: string[] = [`Testresultaten CeritaProject (${rows.length} testers, zonder namen)`];
  rows.forEach((r, n) => {
    const role: TesterRole = r.role === "ouder" ? "ouder" : "jongere";
    const p = testProgress(role, r.checks, r.notes);
    out.push("", `— Tester ${n + 1} (${role}) · ${p.done}/${p.total} vragen`);
    const known = new Set(testQuestions(role).map((q) => q.id));
    for (const q of testQuestions(role)) {
      const a = (r.notes[q.id] ?? "").trim();
      if (a) out.push(`${q.question} ${a}`);
    }
    // Answers to questions from an earlier version of the list.
    for (const [k, v] of Object.entries(r.notes)) {
      if (!known.has(k) && k !== "verstuurd" && v.trim()) out.push(`(eerdere vraag “${k}”) ${v.trim()}`);
    }
    if (r.notes["verstuurd"]) out.push("✅ verstuurd");
  });
  const older = messages.map((m) => m.trim()).filter(Boolean);
  if (older.length) {
    out.push("", "=== Verstuurde testberichten (ook van vóór de live lijst) ===");
    older.forEach((m) => out.push("", m));
  }
  return out.join("\n");
}
