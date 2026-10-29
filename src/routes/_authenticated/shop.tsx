import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { toast } from "sonner";
import { Download, Gift, Heart, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createShopCheckout, confirmShopOrder, getDownloadUrl } from "@/lib/shop.functions";
import { SHOP_CATEGORIES, SHOP_CATEGORY_LABELS, TIERS, TIER_LABELS, tierPrice, pointsFor, euro, shopInfo, SHIPPING_TIME, type ShopProduct, type Tier } from "@/lib/shop";
import img1 from "@/assets/game-clicks-1.jpg";
import img2 from "@/assets/game-clicks-2.jpg";
import img3 from "@/assets/game-clicks-3.jpg";

export const Route = createFileRoute("/_authenticated/shop")({
  validateSearch: (s: Record<string, unknown>): { session_id?: string | undefined } => ({
    session_id: typeof s["session_id"] === "string" ? s["session_id"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "CeritaShop" },
      { name: "description", content: "Fidgets en printbare journals: betaal wat je voelt, of geef er een cadeau aan een andere jongere." },
      { property: "og:title", content: "CeritaShop" },
      { property: "og:description", content: "Betaal wat je voelt en help een andere jongere aan een gratis exemplaar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ShopPage,
});

const PHOTOS: Record<string, string[]> = { game_clicks: [img1, img2, img3] };

function ShopPage() {
  const { session_id } = Route.useSearch();
  const qc = useQueryClient();
  const confirm = useServerFn(confirmShopOrder);
  const download = useServerFn(getDownloadUrl);
  const done = useRef(false);
  const [selected, setSelected] = useState<ShopProduct | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ["shop-products"],
    queryFn: async () =>
      ((await supabase.from("shop_products").select("*").eq("is_active", true).eq("kind", "fysiek").order("sort")).data ?? []) as ShopProduct[],
  });
  const { data: freeCount = 0 } = useQuery({
    queryKey: ["free-items"],
    queryFn: async () => (await supabase.rpc("free_items_available")).data ?? 0,
  });
  const { data: orders = [] } = useQuery({
    queryKey: ["my-orders"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      return (await supabase.from("shop_orders").select("*").eq("user_id", u.user!.id).neq("kind", "gift").order("created_at", { ascending: false })).data ?? [];
    },
  });

  useEffect(() => {
    if (!session_id || done.current) return;
    done.current = true;
    confirm({ data: { sessionId: session_id, environment: getStripeEnvironment() } }).then((r) => {
      if (r.ok) toast.success(r.gift ? "Bedankt! Je bestelling is binnen en er staat een cadeau klaar voor een andere jongere 💖" : "Bedankt! Je bestelling is binnen.");
      else toast.error(r.error ?? "Er ging iets mis");
      qc.invalidateQueries({ queryKey: ["my-orders"] });
      qc.invalidateQueries({ queryKey: ["free-items"] });
      window.history.replaceState(null, "", "/shop");
    });
  }, [session_id, confirm, qc]);

  const filtered = products.filter((p) => {
    if (cat && p.category !== cat) return false;
    if (q && !`${p.name} ${p.description}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  if (selected) return <ProductDetail product={selected} freeCount={freeCount} onBack={() => setSelected(null)} />;

  return (
    <div className="space-y-4 pt-2">
      <PaymentTestModeBanner />
      <h1 className="text-3xl">CeritaShop</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Zoek een product…" value={q} onChange={(e) => setQ(e.target.value)} className="rounded-full pl-9" />
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant={cat === null ? "default" : "outline"} className="rounded-full" onClick={() => setCat(null)}>Alles</Button>
        {SHOP_CATEGORIES.map((c) => (
          <Button key={c} size="sm" variant={cat === c ? "default" : "outline"} className="rounded-full" onClick={() => setCat(c)}>
            {SHOP_CATEGORY_LABELS[c]}
          </Button>
        ))}
      </div>

      {freeCount > 0 && (
        <section className="space-y-2 rounded-3xl border-2 border-dashed border-primary/40 bg-card p-5">
          <h2 className="flex items-center gap-2 text-lg"><Gift className="size-5 text-primary" /> {freeCount} gratis {freeCount === 1 ? "exemplaar" : "exemplaren"} klaar</h2>
          <p className="text-sm text-muted-foreground">Andere leden hebben een Game Clicks cadeau gedaan. Open het product om er gratis een te bestellen (1 per persoon, op = op).</p>
        </section>
      )}

      <section className="rounded-3xl bg-card p-5 shadow-soft">
        <button onClick={() => setInfoOpen(!infoOpen)} className="flex w-full items-center justify-between gap-3 text-left">
          <h2 className="text-lg">Hoe werkt de CeritaShop?</h2>
          <span className="shrink-0 text-xs text-muted-foreground">{infoOpen ? "verberg" : "toon"}</span>
        </button>
        {infoOpen && (
          <>
            <ul className="mt-3 space-y-3">
              {shopInfo("fysiek").map((i) => (
                <li key={i.title} className="flex gap-3">
                  <span className="shrink-0 text-xl">{i.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold">{i.title}</p>
                    <p className="text-xs text-muted-foreground">{i.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">Digitale journals: die heb je meteen als pdf, zonder verzendkosten.</p>
          </>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3">
        {filtered.map((p) => (
          <button key={p.id} onClick={() => setSelected(p)} className="overflow-hidden rounded-3xl bg-card text-left shadow-soft">
            {PHOTOS[p.id]?.[0] ? (
              <img src={PHOTOS[p.id]?.[0]} alt={p.name} className="aspect-square w-full object-cover" />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center bg-muted text-6xl">{p.emoji}</div>
            )}
            <div className="space-y-1 p-3">
              <p className="text-sm font-semibold leading-tight">{p.name}</p>
              <p className="text-xs text-muted-foreground">{SHOP_CATEGORY_LABELS[p.category]} · {p.kind === "digitaal" ? "Download" : "Wordt verstuurd"}</p>
              <p className="text-sm font-bold text-primary">vanaf {euro(tierPrice("min", p).totalCents)}</p>
              <p className="inline-block rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">Betaal wat je voelt</p>
            </div>
          </button>
        ))}
      </div>
      {filtered.length === 0 && <p className="text-sm text-muted-foreground">Niets gevonden. Probeer een andere zoekterm.</p>}

      {orders.length > 0 && (
        <section className="space-y-2 rounded-3xl bg-card p-5 shadow-soft">
          <h2 className="text-lg">Mijn bestellingen</h2>
          {orders.map((o) => {
            const isDigital = products.find((p) => p.id === o.product_id)?.kind === "digitaal";
            return (
            <div key={o.id} className="rounded-2xl bg-muted p-3 text-sm">
              <div className="flex justify-between">
                <span>{o.product} {o.kind === "free" ? "(gratis)" : euro(o.amount_cents)}</span>
                {!isDigital && <span className="text-muted-foreground">{o.status === "verzonden" ? "Verzonden 📦" : "Wordt ingepakt"}</span>}
              </div>
              {isDigital && o.kind === "paid" && (
                <Button size="sm" className="mt-2 rounded-full" onClick={async () => {
                  const w = window.open("", "_blank");
                  const r = await download({ data: { orderId: o.id } });
                  if (r.url) { if (w) w.location.href = r.url; else window.location.href = r.url; }
                  else { w?.close(); toast.error(r.error ?? "Download mislukt"); }
                }}><Download className="size-4" /> Download pdf</Button>
              )}
              {o.tracking_code && <p className="mt-1 text-xs text-muted-foreground">Track&trace: <b>{o.tracking_code}</b> — volg je pakket op dhl.nl</p>}
            </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function ProductDetail({ product: p, freeCount, onBack }: { product: ShopProduct; freeCount: number; onBack: () => void }) {
  const qc = useQueryClient();
  const [photo, setPhoto] = useState(0);
  const [tier, setTier] = useState<Tier>("mid");
  const [addr, setAddr] = useState({ name: "", street: "", postcode: "", city: "" });
  const [checkout, setCheckout] = useState(false);
  const create = useServerFn(createShopCheckout);
  const digital = p.kind === "digitaal";
  const photos = PHOTOS[p.id];

  const addrOk = digital || Object.values(addr).every((v) => v.trim());
  const tiers = digital ? (["min", "mid"] as Tier[]) : TIERS;

  const options = useMemo(() => ({
    fetchClientSecret: async () => {
      const r = await create({ data: { productId: p.id, tier, address: addr, returnUrl: `${window.location.origin}/shop?session_id={CHECKOUT_SESSION_ID}`, environment: getStripeEnvironment() } });
      if ("error" in r) throw new Error(r.error);
      return r.clientSecret;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [checkout]);

  async function claimFree() {
    if (!Object.values(addr).every((v) => v.trim())) { toast.error("Vul eerst je adres in."); return; }
    const { error } = await supabase.rpc("claim_free_item", { _name: addr.name, _street: addr.street, _postcode: addr.postcode, _city: addr.city });
    if (error) toast.error(error.message);
    else { toast.success("Gratis Game Clicks besteld! Hij komt eraan 🎁"); qc.invalidateQueries(); }
  }

  return (
    <div className="space-y-4 pt-2">
      <button onClick={onBack} className="text-sm text-primary underline">Terug naar de shop</button>

      <section className="overflow-hidden rounded-3xl bg-card shadow-soft">
        {photos ? (
          <>
            <img src={photos[photo]} alt={p.name} className="aspect-square w-full object-cover" />
            <div className="flex gap-2 p-3">
              {photos.map((ph, i) => (
                <button key={i} onClick={() => setPhoto(i)} className={`size-16 overflow-hidden rounded-xl border-2 ${i === photo ? "border-primary" : "border-transparent"}`}>
                  <img src={ph} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-muted text-7xl">{p.emoji}</div>
        )}
        <div className="space-y-2 px-5 pb-5">
          <h2 className="text-2xl text-primary">{p.name}</h2>
          <p className="text-sm text-muted-foreground">{p.description}</p>
        </div>
      </section>

      <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
        <h2 className="text-lg">Betaal wat je voelt</h2>
        <div className={`grid gap-2 ${tiers.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {tiers.map((t) => (
            <button key={t} onClick={() => { setTier(t); setCheckout(false); }}
              className={`rounded-2xl border-2 p-3 text-center ${tier === t ? "border-primary bg-secondary" : "border-border"}`}>
              <span className="block text-xs text-muted-foreground">{TIER_LABELS[t]}</span>
              <span className="block text-lg font-bold">{euro(tierPrice(t, p).totalCents)}</span>
              {t === "gift" && <Heart className="mx-auto mt-1 size-4 text-primary" />}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {tier === "gift" && !digital
            ? "Jij krijgt er een, en er komt er een gratis klaar te staan voor een jongere die het lastig vindt om te kopen. Inclusief verzending voor allebei."
            : digital
              ? "Digitaal product: je ontvangt de pdf na betaling. Geen verzendkosten."
              : `Inclusief verzending met DHL, binnen ${SHIPPING_TIME} binnen.`}{" "}
          Je diertje krijgt {pointsFor(tierPrice(tier, p).totalCents)} punten.
        </p>
        {!digital && (
          <>
            <h3 className="pt-2 text-sm font-semibold">Verzendadres</h3>
            <Input placeholder="Naam" value={addr.name} onChange={(e) => setAddr({ ...addr, name: e.target.value })} className="rounded-2xl" />
            <Input placeholder="Straat en huisnummer" value={addr.street} onChange={(e) => setAddr({ ...addr, street: e.target.value })} className="rounded-2xl" />
            <div className="flex gap-2">
              <Input placeholder="Postcode" value={addr.postcode} onChange={(e) => setAddr({ ...addr, postcode: e.target.value })} className="w-32 rounded-2xl" />
              <Input placeholder="Plaats" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} className="rounded-2xl" />
            </div>
          </>
        )}
        {digital && (
          <>
            <h3 className="pt-2 text-sm font-semibold">Je naam</h3>
            <Input placeholder="Naam" value={addr.name} onChange={(e) => setAddr({ ...addr, name: e.target.value, street: "-", postcode: "-", city: "-" })} className="rounded-2xl" />
          </>
        )}

        {!checkout && <Button disabled={!addrOk || (digital && !addr.name.trim())} className="w-full rounded-full" onClick={() => setCheckout(true)}>Afrekenen</Button>}
        {!digital && p.id === "game_clicks" && freeCount > 0 && !checkout && (
          <Button variant="outline" disabled={!addrOk} className="w-full rounded-full" onClick={claimFree}><Gift className="size-4" /> Gratis bestellen</Button>
        )}
      </section>

      <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
        <h2 className="text-lg">Wat je moet weten</h2>
        <ul className="space-y-3">
          {shopInfo(p.kind).map((i) => (
            <li key={i.title} className="flex gap-3">
              <span className="shrink-0 text-xl">{i.emoji}</span>
              <div>
                <p className="text-sm font-semibold">{i.title}</p>
                <p className="text-xs text-muted-foreground">{i.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {checkout && (
        <div className="overflow-hidden rounded-3xl bg-card" key={tier}>
          <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      )}
    </div>
  );
}
