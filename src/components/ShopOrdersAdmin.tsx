import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sendAnnouncement, notifyOrderUpdate } from "@/lib/push.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { euro, settlement, TIER_LABELS, type Tier } from "@/lib/shop";

export function ShopOrdersAdmin() {
  const qc = useQueryClient();
  const send = useServerFn(sendAnnouncement);
  const notifyOrder = useServerFn(notifyOrderUpdate);
  const { data } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const [o, f] = await Promise.all([
        supabase.from("shop_orders").select("*").neq("kind", "gift").order("created_at", { ascending: false }).limit(100),
        supabase.rpc("free_items_available"),
      ]);
      return { orders: o.data ?? [], free: f.data ?? 0 };
    },
  });
  const free = data?.free ?? 0;
  const orders = data?.orders ?? [];
  const tot = orders.reduce((a, o) => { const x = settlement(o); return { paid: a.paid + x.paid, shipping: a.shipping + x.shipping, cost: a.cost + x.cost, profit: a.profit + x.profit, points: a.points + o.points }; }, { paid: 0, shipping: 0, cost: 0, profit: 0, points: 0 });

  async function announce() {
    if (!confirm(`Pushmelding sturen dat er ${free} gratis Game Clicks klaarstaan?`)) return;
    try {
      const r = await send({ data: { title: "🎁 Gratis Game Clicks!", body: `Er ${free === 1 ? "staat" : "staan"} ${free} gratis Game Clicks klaar in de CeritaShop. Op = op!` } });
      toast.success(`Verstuurd naar ${r.users} leden.`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Mislukt"); }
  }
  async function toggle(id: string, status: string) {
    const next = status === "verzonden" ? "nieuw" : "verzonden";
    await supabase.from("shop_orders").update({ status: next }).eq("id", id);
    if (next === "verzonden") notifyOrder({ data: { orderId: id } }).catch(() => {});
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  }
  async function saveTracking(id: string, code: string) {
    const { error } = await supabase.from("shop_orders").update({ tracking_code: code.trim() || null }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Track&trace opgeslagen");
    notifyOrder({ data: { orderId: id } }).catch(() => {});
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  }

  return (
    <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
      <h2 className="text-lg">Shop-bestellingen</h2>
      <div className="flex items-center justify-between rounded-2xl bg-muted p-3 text-sm">
        <span>🎁 Gratis klaar: <b>{free}</b></span>
        <Button size="sm" className="rounded-full" disabled={free < 1} onClick={announce}>Melding sturen</Button>
      </div>
      <p className="text-xs text-muted-foreground">Elke maandag om 18:00 gaat er automatisch een pushmelding uit als er gratis exemplaren klaarstaan.</p>
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-3 text-sm">
        <span>Ontvangen: <b>{euro(tot.paid)}</b></span>
        <span>Verzending: <b>{euro(tot.shipping)}</b></span>
        <span>Inkoop: <b>{euro(tot.cost)}</b></span>
        <span>Winst: <b>{euro(tot.profit)}</b></span>
        <span className="col-span-2">Punten uitgedeeld: <b>{tot.points}</b></span>
      </div>
      {orders.map((o) => { const x = settlement(o); return (
        <div key={o.id} className="rounded-2xl bg-muted p-3 text-sm">
          <p className="font-semibold">{o.kind === "free" ? "Gratis exemplaar" : `${euro(o.amount_cents)} · ${o.tier ? TIER_LABELS[o.tier as Tier] : ""}`} · {new Date(o.created_at).toLocaleString("nl-NL")}</p>
          <p className="text-xs">Status: <b>{o.status === "verzonden" ? "Verzonden" : "Nieuw"}</b> · Punten: <b>+{o.points}</b>{o.kind !== "free" && <> · Verzending {euro(x.shipping)} · Inkoop {euro(x.cost)} · Winst {euro(x.profit)}</>}</p>
          <p className="text-muted-foreground">{o.ship_name}, {o.ship_street}, {o.ship_postcode} {o.ship_city}</p>
          <TrackingInput orderId={o.id} value={o.tracking_code ?? ""} onSave={saveTracking} />
          <Button size="sm" variant={o.status === "verzonden" ? "outline" : "default"} className="mt-2 rounded-full" onClick={() => toggle(o.id, o.status)}>
            {o.status === "verzonden" ? "Verzonden ✓" : "Markeer als verzonden"}
          </Button>
        </div>
      ); })}
      {data?.orders.length === 0 && <p className="text-sm text-muted-foreground">Nog geen bestellingen.</p>}
    </section>
  );
}

function TrackingInput({ orderId, value, onSave }: { orderId: string; value: string; onSave: (id: string, code: string) => void }) {
  const [code, setCode] = useState(value);
  return (
    <div className="mt-2 flex gap-2">
      <Input placeholder="Track&trace-code (DHL)" value={code} onChange={(e) => setCode(e.target.value)} className="h-8 rounded-xl text-xs" />
      <Button size="sm" variant="outline" className="h-8 rounded-full" disabled={code.trim() === value} onClick={() => onSave(orderId, code)}>Opslaan</Button>
    </div>
  );
}
