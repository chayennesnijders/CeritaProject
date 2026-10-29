import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { analyzeReport } from "@/lib/report-ai.functions";

export function AiReportHelper() {
  const run = useServerFn(analyzeReport);
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setError(""); setResult("");
    try { setResult((await run({ data: { text } })).result); }
    catch (e) { setError(e instanceof Error ? e.message : "Er ging iets mis."); }
    finally { setBusy(false); }
  }
  return (
    <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
      <h2 className="text-lg">AI-hulp bij meldingen</h2>
      <p className="text-xs text-muted-foreground">Plak de tekst van een melding. Je krijgt een samenvatting en voorstellen voor vervolgstappen — jij beslist altijd zelf.</p>
      <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Tekst van de melding…" className="rounded-2xl" />
      <Button disabled={busy || text.trim().length < 5} onClick={go} className="w-full rounded-full">{busy ? "Bezig met analyseren…" : "Samenvatten & advies"}</Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && <div className="whitespace-pre-wrap rounded-2xl bg-muted p-3 text-sm">{result.replace(/\*\*/g, "")}</div>}
    </section>
  );
}
