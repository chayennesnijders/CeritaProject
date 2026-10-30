import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { euro } from "@/lib/shop";
import { returnAddressMail, returnStatus } from "@/lib/returns";
import { refundReturn } from "@/lib/shop.functions";
import { notifyReturnUpdate } from "@/lib/push.functions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Confirm = { id: string; action: "refund" | "refuse"; product: string; amount: number };

/** Owner: returns, step by step: mail the address, package received, refund (via Stripe) or refuse. */
export function ReturnsAdmin() {
  const qc = useQueryClient();
  const refund = useServerFn(refundReturn);
  const notify = useServerFn(notifyReturnUpdate);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);

  const { data } = useQuery({
    queryKey: ["admin-returns"],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("shop_returns")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      const orderIds = (rows ?? []).map((r) => r.order_id);
      const { data: orders } = orderIds.length
        ? await supabase
            .from("shop_orders")
            .select("id, product, amount_cents, ship_name, created_at")
            .in("id", orderIds)
        : { data: [] };
      return { rows: rows ?? [], orders: Object.fromEntries((orders ?? []).map((o) => [o.id, o])) };
    },
  });
  const rows = data?.rows ?? [];
  const open = rows.filter((r) => r.status !== "terugbetaald" && r.status !== "afgewezen");
  const shown = showDone ? rows : open;
  if (rows.length === 0) return null;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-returns"] });
    qc.invalidateQueries({ queryKey: ["admin-news"] });
  };
  async function move(id: string, status: "adres_gestuurd" | "ontvangen" | "afgewezen") {
    setBusy(id);
    const { error } = await supabase.rpc("set_return_status", { _return: id, _status: status });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    notify({ data: { returnId: id } }).catch(() => {});
    refresh();
  }
  async function doConfirm() {
    if (!confirm) return;
    const c = confirm;
    setConfirm(null);
    if (c.action === "refuse") return move(c.id, "afgewezen");
    setBusy(c.id);
    const r = await refund({ data: { returnId: c.id } });
    setBusy(null);
    if (r.ok) toast.success("Terugbetaald via Stripe 💸");
    else toast.error(r.error ?? "Terugbetalen lukte niet.");
    refresh();
  }

  return (
    <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <h2 className="text-lg">
          ↩️ Retouren{" "}
          {open.length > 0 && <span className="text-sm text-primary">({open.length} open)</span>}
        </h2>
        <button className="text-xs text-primary underline" onClick={() => setShowDone(!showDone)}>
          {showDone ? "Alleen open" : "Alles"}
        </button>
      </div>
      {shown.length === 0 && (
        <p className="text-sm text-muted-foreground">Geen open retouren. 🎉</p>
      )}
      {shown.map((r) => {
        const o = data?.orders[r.order_id];
        const mail = returnAddressMail(o?.product ?? "je bestelling", o?.ship_name ?? "");
        const st = returnStatus(r.status);
        return (
          <div key={r.id} className="space-y-2 rounded-2xl bg-muted p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">
                {o?.product} · {o ? euro(o.amount_cents) : ""}
              </p>
              <span className="shrink-0 rounded-full bg-card px-2 py-0.5 text-[10px] font-bold">
                {st.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {o?.ship_name} · aangevraagd op {new Date(r.created_at).toLocaleDateString("nl-NL")} ·{" "}
              {r.contact_email}
            </p>
            {r.reason && <p className="rounded-xl bg-card p-2 text-xs">"{r.reason}"</p>}
            {r.status !== "terugbetaald" && r.status !== "afgewezen" && (
              <div className="flex flex-wrap gap-2">
                {r.status === "aangevraagd" && (
                  <>
                    <Button asChild size="sm" className="rounded-full">
                      <a
                        href={`mailto:${r.contact_email}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`}
                      >
                        ✉️ Mail het retouradres
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      disabled={busy === r.id}
                      onClick={() => move(r.id, "adres_gestuurd")}
                    >
                      Adres gemaild ✓
                    </Button>
                  </>
                )}
                {r.status === "adres_gestuurd" && (
                  <Button
                    size="sm"
                    className="rounded-full"
                    disabled={busy === r.id}
                    onClick={() => move(r.id, "ontvangen")}
                  >
                    📦 Pakketje ontvangen
                  </Button>
                )}
                {r.status === "ontvangen" && (
                  <Button
                    size="sm"
                    className="rounded-full"
                    disabled={busy === r.id}
                    onClick={() =>
                      setConfirm({
                        id: r.id,
                        action: "refund",
                        product: o?.product ?? "",
                        amount: o?.amount_cents ?? 0,
                      })
                    }
                  >
                    💸 Terugbetalen {o ? euro(o.amount_cents) : ""}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full text-destructive"
                  disabled={busy === r.id}
                  onClick={() =>
                    setConfirm({ id: r.id, action: "refuse", product: o?.product ?? "", amount: 0 })
                  }
                >
                  Afwijzen
                </Button>
              </div>
            )}
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">
        Tip: vervang [ADRES] in de mail door je retouradres. Het lid krijgt bij elke stap een
        melding.
      </p>
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.action === "refund" ? "Terugbetalen?" : "Retour afwijzen?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === "refund"
                ? `${euro(confirm.amount)} voor "${confirm.product}" gaat via Stripe terug naar het lid. Dit kun je niet ongedaan maken.`
                : `Mail het lid eerst waarom, bijvoorbeeld omdat het product gebruikt is. Het lid ziet dat de retour is afgewezen.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Annuleren</AlertDialogCancel>
            <Button className="rounded-full" onClick={doConfirm}>
              {confirm?.action === "refund" ? "Ja, terugbetalen" : "Ja, afwijzen"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
