/** Shop: producten uit de database, drie prijsopties. Bedragen in centen. */
export type ShopProduct = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: "fidgets" | "journals";
  kind: "fysiek" | "digitaal";
  cost_cents: number;
  profit_cents: number;
  is_active: boolean;
  sort: number;
};

export const SHOP_CATEGORIES = ["fidgets", "journals"] as const;
export const SHOP_CATEGORY_LABELS: Record<string, string> = {
  fidgets: "Fidgets",
  journals: "Journals",
};

/** Game Clicks: vaste referentie voor de cadeau-pot en oudere bestellingen. */
export const GAME_CLICKS = {
  id: "game_clicks",
  name: "Game Clicks",
  costCents: 260,
  profitCents: 100, // kleding: 1000
};
export const SHIPPING_CENTS = 450; // DHL, per pakketje

export type Tier = "min" | "mid" | "gift";
export const TIERS: Tier[] = ["min", "mid", "gift"];
export const TIER_LABELS: Record<Tier, string> = { min: "Minimum", mid: "Meest gekozen", gift: "Met cadeau" };

export const minItemCents = (p: { cost_cents: number; profit_cents: number }) => p.cost_cents + p.profit_cents;

const GAME_CLICKS_PRODUCT = { cost_cents: GAME_CLICKS.costCents, profit_cents: GAME_CLICKS.profitCents, kind: "fysiek" as const };

/** Totaalprijzen: minimum = item + verzending; cadeau = 2 items + 2x verzending; midden = precies ertussen. Digitaal: geen verzending, geen cadeau. */
export function tierPrice(t: Tier, p: Pick<ShopProduct, "cost_cents" | "profit_cents" | "kind"> = GAME_CLICKS_PRODUCT) {
  const shipping = p.kind === "fysiek" ? SHIPPING_CENTS : 0;
  const min = minItemCents(p) + shipping;
  const gift = minItemCents(p) * 2 + shipping * 2;
  if (t === "min") return { totalCents: min, shippingCents: shipping, items: 1 };
  if (t === "gift") return { totalCents: gift, shippingCents: shipping * 2, items: 2 };
  return { totalCents: Math.round((min + gift) / 2 / 5) * 5, shippingCents: shipping, items: 1 };
}

/** Diertjespunten per bestelling: 1 punt per hele euro betaald. Gratis = 0. */
export const pointsFor = (paidCents: number) => Math.floor(Math.max(0, paidCents) / 100);

/** Afrekening per bestelling. */
export function settlement(o: { kind: string; amount_cents: number; tier: string | null }) {
  const items = o.tier === "gift" ? 2 : 1;
  const shipping = o.kind === "free" ? SHIPPING_CENTS : o.tier === "gift" ? SHIPPING_CENTS * 2 : SHIPPING_CENTS;
  const cost = o.kind === "free" ? 0 : GAME_CLICKS.costCents * items; // gratis exemplaar is al betaald via het cadeau
  const paid = o.amount_cents;
  return { paid, shipping: o.kind === "free" ? 0 : shipping, cost, profit: o.kind === "free" ? 0 : paid - shipping - cost };
}

export const euro = (c: number) => (c / 100).toLocaleString("nl-NL", { style: "currency", currency: "EUR" });

/** Hoe lang een pakketje onderweg is. Digitaal is er altijd meteen. */
export const SHIPPING_TIME = "1-2 werkdagen";

export type ShopKind = "fysiek" | "digitaal";

/** Uitleg die bij elk product in de shop staat: pay what you feel, verzending, waarom hier, retouren. */
export function shopInfo(kind: ShopKind) {
  return [
    {
      emoji: "💛",
      title: "Betaal wat je voelt",
      text: "Je kiest zelf een bedrag: minimum, meest gekozen, of met cadeau. Het minimum dekt de inkoop en de verzending — meer mag altijd.",
    },
    {
      emoji: "📦",
      title: "Verzending",
      text: kind === "digitaal"
        ? "Digitaal: de pdf staat meteen na betaling bij jouw bestellingen. Geen verzendkosten."
        : `Met DHL, binnen ${SHIPPING_TIME} binnen. De verzending zit al in elk bedrag.`,
    },
    {
      emoji: "🎁",
      title: "Waarom hier shoppen",
      text: "Je koopt rechtstreeks bij CeritaProject, dus het minimum is al laag. Bij het cadeau-bedrag staat er extra een exemplaar gratis klaar voor een jongere die het nu even niet kan kopen.",
    },
    {
      emoji: "🩹",
      title: kind === "digitaal" ? "Iets niet goed?" : "Kapot of verkeerd?",
      text: kind === "digitaal"
        ? "Een pdf kun je niet terugsturen, die heb je meteen. Klopt er iets niet? Stuur een foto en een korte beschrijving, dan lossen we het samen op."
        : "Stuur een foto en een korte beschrijving van het stuk of verkeerde product — net als bij Vinted — dan krijg je je geld terug.",
    },
  ];
}
