import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { canReturn, returnStatus } from "@/lib/returns";
import { useMyReturns } from "@/lib/use-returns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/** Under an order: the return status, or a button to ask for a return. */
export function ReturnRequest({
  order,
}: {
  order: { id: string; kind: string; created_at: string; product: string };
}) {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const { data: returns = [] } = useMyReturns(me?.user.id);
  const existing = returns.find((r) => r.order_id === order.id);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [email, setEmail] = useState(me?.user.email ?? "");
  const [busy, setBusy] = useState(false);

  if (existing) {
    const st = returnStatus(existing.status);
    return (
      <div className="mt-2 rounded-xl bg-card p-2 text-xs">
        <p className="font-semibold">↩️ Retour: {st.label}</p>
        <p className="text-muted-foreground">{st.member}</p>
      </div>
    );
  }
  if (!canReturn(order, false)) return null;
  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 text-xs font-semibold text-primary underline"
      >
        ↩️ Retourneren
      </button>
    );

  async function send() {
    setBusy(true);
    const { error } = await supabase.rpc("request_return", {
      _order: order.id,
      _reason: reason,
      _email: email,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Je retour is aangevraagd. Je krijgt een mail met het adres 📦");
    qc.invalidateQueries({ queryKey: ["my-returns", me?.user.id] });
  }

  return (
    <div className="mt-2 space-y-2 rounded-xl bg-card p-3 text-xs">
      <p className="font-semibold">↩️ {order.product} terugsturen</p>
      <ul className="list-inside list-disc space-y-0.5 text-muted-foreground">
        <li>Binnen 14 dagen nadat je het hebt ontvangen.</li>
        <li>Ongebruikt en in de originele verpakking.</li>
        <li>De verzendkosten voor het terugsturen betaal je zelf.</li>
        <li>Je krijgt het hele bedrag terug zodra het pakketje binnen is.</li>
      </ul>
      <Textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={1000}
        rows={2}
        placeholder="Waarom stuur je het terug? (mag je leeg laten)"
        className="rounded-xl text-sm"
      />
      <label className="block space-y-1">
        <span className="font-semibold">
          Je e-mailadres (hier sturen we het retouradres naartoe)
        </span>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl"
        />
      </label>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
          Toch niet
        </Button>
        <Button
          size="sm"
          className="flex-1 rounded-full"
          disabled={busy || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)}
          onClick={send}
        >
          {busy ? "Bezig…" : "Retour aanvragen"}
        </Button>
      </div>
    </div>
  );
}
