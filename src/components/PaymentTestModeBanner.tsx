const clientToken = import.meta.env['VITE_PAYMENTS_CLIENT_TOKEN'] as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return <div className="w-full rounded-2xl bg-destructive/15 px-4 py-2 text-center text-sm text-destructive">Echt afrekenen is nog niet ingesteld.</div>;
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full rounded-2xl bg-secondary px-4 py-2 text-center text-sm text-secondary-foreground">
        Betalingen in de preview zijn testbetalingen.{" "}
        <a href="https://docs.lovable.dev/features/payments#test-and-live-environments" target="_blank" rel="noopener noreferrer" className="font-medium underline">Meer info</a>
      </div>
    );
  }
  return null;
}
