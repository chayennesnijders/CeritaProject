import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Send, X, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { reportActionSchema } from "@/lib/report-actions";
import { reportsQueryOptions } from "@/lib/reports";
import { useMe } from "@/lib/auth";

export function ReportInbox({ onWarn, onTimeout }: { onWarn: (id: string) => void; onTimeout: (id: string, hours: number) => void }) {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [closed, setClosed] = useState(false);
  const [replyId, setReplyId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const { data, isPending, error, refetch } = useQuery(reportsQueryOptions(me?.isStaff ? me.user.id : undefined, closed));
  async function act(reportId: string, action: "answer" | "reject" | "hide") {
    const parsed = reportActionSchema.safeParse({ reportId, action, response: replyId === reportId ? text : "" });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Controleer je antwoord"); return; }
    setBusy(reportId);
    try {
      const { error } = await supabase.rpc("respond_report", { _report: reportId, _action: action, _response: parsed.data.response });
      if (error) throw error;
      setReplyId(null); setText("");
      await Promise.all(["report-inbox", "admin", "unread", "moderation"].map((key) => qc.invalidateQueries({ queryKey: [key] })));
      toast.success(action === "answer" ? "Antwoord verstuurd" : action === "reject" ? "Melding afgekeurd" : "Bericht verborgen");
    } catch { toast.error("Afhandelen is niet gelukt. Vernieuw en probeer opnieuw."); }
    finally { setBusy(null); }
  }
  return <section className="space-y-3">
    <h2 className="text-lg">Meldingen van leden</h2>
    <div className="flex gap-2">
      <Button size="sm" variant={closed ? "outline" : "default"} onClick={() => setClosed(false)}>Open</Button>
      <Button size="sm" variant={closed ? "default" : "outline"} onClick={() => setClosed(true)}>Afgehandeld</Button>
    </div>
    {isPending && <p className="text-sm text-muted-foreground">Meldingen laden…</p>}
    {error && <div role="alert" className="text-sm text-destructive">Meldingen konden niet worden geladen. <Button size="sm" variant="outline" onClick={() => refetch()}>Opnieuw proberen</Button></div>}
    {data?.length === 0 && <p className="text-sm text-muted-foreground">{closed ? "Nog geen afgehandelde meldingen." : "Geen open meldingen."}</p>}
    {data?.map((r) => {
      const target = r.post?.author_id ?? r.message?.sender_id;
      return <article key={r.id} className="space-y-2 rounded-lg border border-border bg-card p-4 text-sm">
        <h3 className="text-sm font-bold">{r.reporter?.display_name ?? "Lid"} · {r.message_id ? "Privébericht" : r.post_id ? "Groepsbericht" : "Melding"}</h3>
        <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("nl-NL")}</p>
        <p className="break-words">{r.reason}</p>
        {(r.post ?? r.message) && <blockquote className="break-words border-l-2 border-secondary pl-3 text-muted-foreground">{r.post?.body ?? r.message?.body}</blockquote>}
        {closed ? <div className="border-t border-border pt-2"><p className="font-semibold">{r.status === "afgewezen" ? "Afgekeurd" : r.status === "beantwoord" ? "Beantwoord" : "Afgehandeld"}</p><p className="whitespace-pre-wrap break-words">{r.response}</p></div> : <>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy !== null} onClick={() => { setReplyId(r.id); setText(""); }}><MessageCircle className="size-4" />Beantwoorden</Button>
            <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => act(r.id, "reject")}><X className="size-4" />Afkeuren</Button>
            {r.post_id && <Button size="sm" variant="destructive" disabled={busy !== null} onClick={() => act(r.id, "hide")}><EyeOff className="size-4" />Verbergen</Button>}
            {target && <><Button size="sm" variant="outline" onClick={() => onWarn(target)}>Waarschuwen</Button><Button size="sm" variant="outline" onClick={() => onTimeout(target, 24)}>Time-out 1 dag</Button><Button size="sm" variant="outline" onClick={() => onTimeout(target, 168)}>Time-out 7 dagen</Button></>}
          </div>
          {replyId === r.id && <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); act(r.id, "answer"); }}>
            <label className="block font-semibold" htmlFor={`reply-${r.id}`}>Antwoord aan {r.reporter?.display_name ?? "het lid"}</label>
            <textarea id={`reply-${r.id}`} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={3} className="w-full rounded-lg border border-input bg-background p-3" />
            <div className="flex flex-wrap gap-2"><Button type="submit" size="sm" disabled={!text.trim() || busy !== null}><Send className="size-4" />{busy === r.id ? "Versturen…" : "Antwoord versturen"}</Button><Button type="button" size="sm" variant="ghost" onClick={() => setReplyId(null)}>Annuleren</Button></div>
          </form>}
        </>}
      </article>;
    })}
  </section>;
}