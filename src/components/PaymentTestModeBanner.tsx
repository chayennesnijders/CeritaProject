const clientToken = import.meta.env['VITE_STRIPE_PUBLISHABLE_KEY'] as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return <div className="w-full rounded-2xl bg-destructive/15 px-4 py-2 text-center text-sm text-destructive">Echt afrekenen is nog niet ingesteld.</div>;
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full rounded-2xl bg-secondary px-4 py-2 text-center text-sm text-secondary-foreground">
        Dit zijn testbetalingen: er wordt geen echt geld afgeschreven.{" "}
        <a href="https://docs.stripe.com/testing" target="_blank" rel="noopener noreferrer" className="font-medium underline">Meer info</a>
      </div>
    );
  }
  return null;
}
