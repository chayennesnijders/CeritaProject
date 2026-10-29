import { loadStripe, Stripe } from "@stripe/stripe-js";

type StripeEnv = 'sandbox' | 'live';
const clientToken = import.meta.env['VITE_STRIPE_PUBLISHABLE_KEY'] as string | undefined;

function paymentsEnvironment(): StripeEnv {
  if (clientToken?.startsWith('pk_test_')) return 'sandbox';
  if (clientToken?.startsWith('pk_live_')) return 'live';
  throw new Error("Betalen is nog niet ingesteld voor deze versie. Zet VITE_STRIPE_PUBLISHABLE_KEY in je .env.");
}

let stripePromise: Promise<Stripe | null> | null = null;
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) { paymentsEnvironment(); stripePromise = loadStripe(clientToken as string); }
  return stripePromise;
}
export function getStripeEnvironment(): StripeEnv { return paymentsEnvironment(); }
