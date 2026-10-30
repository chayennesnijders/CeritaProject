import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type Stripe from "stripe";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";
import { tierPrice, pointsFor, SHIPPING_CENTS, type ShopProduct } from "@/lib/shop";

const addr = z.object({
  name: z.string().trim().min(1).max(100),
  street: z.string().trim().min(1).max(150),
  postcode: z.string().trim().min(1).max(12),
  city: z.string().trim().min(1).max(80),
});

async function loadProduct(productId: string): Promise<ShopProduct | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("shop_products").select("*").eq("id", productId).eq("is_active", true).maybeSingle();
  return (data as ShopProduct | null) ?? null;
}

export const createShopCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    productId: z.string().trim().min(1).max(60),
    tier: z.enum(["min", "mid", "gift"]),
    address: addr,
    returnUrl: z.string().url(),
    environment: z.enum(["sandbox", "live"]),
  }).parse(d))
  .handler(async ({ data, context }): Promise<{ clientSecret: string } | { error: string }> => {
    const product = await loadProduct(data.productId);
    if (!product) return { error: "Dit product is er niet (meer)." };
    // Digitale producten verkopen we niet: in de app-winkels van Apple en Google moet dat via hun eigen betaalsysteem.
    if (product.kind === "digitaal") return { error: "Dit product is er niet (meer)." };
    const gift = data.tier === "gift";
    const price = tierPrice(gift ? "gift" : data.tier, product);
    try {
      const stripe = createStripeClient(data.environment);
      const email = (context.claims as { email?: string }).email;
      const userId = context.userId;
      const found = await stripe.customers.search({ query: `metadata['userId']:'${userId}'`, limit: 1 });
      const customerId = found.data[0]?.id ?? (await stripe.customers.create({ ...(email && { email }), metadata: { userId } })).id;
      const a = data.address;
      const line_items: NonNullable<Stripe.Checkout.SessionCreateParams["line_items"]> = [
        { quantity: 1, price_data: { currency: "eur", unit_amount: price.totalCents - price.shippingCents, tax_behavior: "inclusive",
          product_data: { name: gift ? `${product.name} + 1 cadeau voor een jongere` : product.name, tax_code: "txcd_99999999" } } },
      ];
      if (price.shippingCents > 0) {
        line_items.push({ quantity: 1, price_data: { currency: "eur", unit_amount: price.shippingCents, tax_behavior: "inclusive",
          product_data: { name: gift ? "Verzending (DHL) x2" : "Verzending (DHL)", tax_code: "txcd_92010001" } } });
      }
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        automatic_tax: { enabled: true },
        customer_update: { address: "auto" },
        billing_address_collection: "required",
        line_items,
        payment_intent_data: { description: product.name },
        metadata: { userId, product_id: product.id, product_name: product.name, gift: gift ? "1" : "0", tier: data.tier, ship_name: a.name, ship_street: a.street, ship_postcode: a.postcode, ship_city: a.city },
      } as Stripe.Checkout.SessionCreateParams);
      return { clientSecret: session.client_secret ?? "" };
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }
  });

/** Na betalen: sessie controleren en bestelling (en evt. cadeau) één keer vastleggen. */
export const confirmShopOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ sessionId: z.string().regex(/^cs_[A-Za-z0-9_]+$/), environment: z.enum(["sandbox", "live"]) }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean; gift?: boolean; error?: string }> => {
    try {
      const stripe = createStripeClient(data.environment);
      const s = await stripe.checkout.sessions.retrieve(data.sessionId);
      const m = (s.metadata ?? {}) as Partial<Record<"userId" | "product_id" | "product_name" | "gift" | "tier" | "ship_name" | "ship_street" | "ship_postcode" | "ship_city", string>>;
      if (m.userId !== context.userId) return { ok: false, error: "Deze bestelling is niet van jou." };
      if (s.payment_status !== "paid") return { ok: false, error: "De betaling is nog niet gelukt." };
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const base = { user_id: context.userId, ship_name: m.ship_name!, ship_street: m.ship_street!, ship_postcode: m.ship_postcode!, ship_city: m.ship_city! };
      const { data: existing } = await supabaseAdmin.from("shop_orders").select("id").eq("stripe_session_id", s.id).maybeSingle();
      if (!existing) {
        const { error } = await supabaseAdmin.from("shop_orders").insert({
          ...base,
          product: m.product_name ?? "Game Clicks",
          product_id: m.product_id ?? null,
          kind: "paid",
          amount_cents: s.amount_total ?? 0,
          stripe_session_id: s.id,
          tier: m.tier ?? null,
          points: pointsFor(s.amount_total ?? 0),
        });
        if (!error) {
          const { data: pet } = await supabaseAdmin.from("pets").select("xp").eq("user_id", context.userId).maybeSingle();
          if (pet) await supabaseAdmin.from("pets").update({ xp: pet.xp + pointsFor(s.amount_total ?? 0) }).eq("user_id", context.userId);
        }
        if (error && error.code !== "23505") throw error;
        if (!error && m.gift === "1") {
          await supabaseAdmin.from("shop_orders").insert({ ...base, product: m.product_name ?? "Game Clicks", product_id: m.product_id ?? null, kind: "gift", ship_name: "Cadeau-pot", ship_street: "-", ship_postcode: "-", ship_city: "-" });
        }
      }
      return { ok: true, gift: m.gift === "1" };
    } catch (e) {
      return { ok: false, error: getStripeErrorMessage(e) };
    }
  });

/** Downloadlink voor een betaald digitaal product (alleen voor de koper zelf). */
export const getDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<{ url?: string; error?: string }> => {
    const { data: order } = await context.supabase.from("shop_orders").select("product_id, user_id, kind").eq("id", data.orderId).maybeSingle();
    if (!order || order.user_id !== context.userId || order.kind !== "paid" || !order.product_id) return { error: "Geen download gevonden." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin.from("shop_products").select("kind").eq("id", order.product_id).maybeSingle();
    if (p?.kind !== "digitaal") return { error: "Dit is geen digitaal product." };
    const { data: s, error } = await supabaseAdmin.storage.from("digital-products").createSignedUrl(`${order.product_id}.pdf`, 300, { download: `${order.product_id}.pdf` });
    if (error || !s) return { error: "De pdf is (nog) niet beschikbaar." };
    return { url: s.signedUrl };
  });

// SHIPPING_CENTS blijft geëxporteerd voor bestaande imports.
export { SHIPPING_CENTS };

/** Owner only: pay a return back via Stripe (the whole order amount) and take back the pet points it gave. */
export const refundReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ returnId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    const { data: isOwner } = await context.supabase.rpc("is_owner", { _user_id: context.userId });
    if (!isOwner) return { ok: false, error: "Alleen de eigenaar kan terugbetalen." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ret } = await supabaseAdmin.from("shop_returns").select("*").eq("id", data.returnId).maybeSingle();
    if (!ret) return { ok: false, error: "Retour niet gevonden." };
    if (ret.status === "terugbetaald") return { ok: true };
    const { data: order } = await supabaseAdmin.from("shop_orders").select("*").eq("id", ret.order_id).maybeSingle();
    if (!order?.stripe_session_id) return { ok: false, error: "Bij deze bestelling hoort geen betaling." };
    try {
      const { stripeEnvironmentFor } = await import("@/lib/returns");
      const stripe = createStripeClient(stripeEnvironmentFor(order.stripe_session_id));
      const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
      const intent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
      if (!intent) return { ok: false, error: "De betaling is niet gevonden bij Stripe." };
      await stripe.refunds.create(
        { payment_intent: intent, metadata: { returnId: ret.id } },
        { idempotencyKey: `refund-${ret.id}` },
      );
    } catch (e) {
      return { ok: false, error: getStripeErrorMessage(e) };
    }
    await supabaseAdmin
      .from("shop_returns")
      .update({ status: "terugbetaald", refund_cents: order.amount_cents, updated_at: new Date().toISOString() })
      .eq("id", ret.id);
    if (order.points > 0) {
      const { data: pet } = await supabaseAdmin.from("pets").select("xp").eq("user_id", order.user_id).maybeSingle();
      if (pet) await supabaseAdmin.from("pets").update({ xp: Math.max(0, pet.xp - order.points) }).eq("user_id", order.user_id);
    }
    const { pushToUser } = await import("@/lib/push.functions");
    await pushToUser(order.user_id, { title: "💸 Je geld is teruggestort", body: `Je retour van ${order.product} is terugbetaald.`, link: "/shop", tag: `retour-${ret.id}` });
    return { ok: true };
  });
