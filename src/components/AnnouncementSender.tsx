import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";
import { sendAnnouncement } from "@/lib/push.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function AnnouncementSender() {
  const send = useServerFn(sendAnnouncement);
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!confirm(`Aankondiging "${title}" naar alle leden met pushmeldingen sturen?`)) return;
    setBusy(true);
    try {
      const r = await send({ data: { title, body } });
      toast.success(`Verstuurd naar ${r.users} leden (${r.sent} apparaten).`);
      setTitle(""); setBody("");
      qc.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Versturen mislukt.");
    } finally { setBusy(false); }
  }

  return (
    <section className="space-y-3 rounded-3xl bg-card p-4 shadow-soft">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-primary"><Megaphone className="size-5" /> Aankondiging sturen</h2>
      <p className="text-sm text-muted-foreground">Gaat als pushmelding naar iedereen die meldingen aan heeft staan.</p>
      <Input placeholder="Titel, bijv. Nieuw in Cerita!" maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea placeholder="Wat wil je vertellen?" maxLength={200} value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{body.length}/200</span>
        <Button onClick={submit} disabled={busy || !title.trim() || !body.trim()}>{busy ? "Versturen..." : "Versturen"}</Button>
      </div>
    </section>
  );
}
