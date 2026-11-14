import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMe } from "@/lib/auth";
import { useActsAsParent } from "@/lib/parent-view";
import { TestForm } from "@/components/TestForm";

export const Route = createFileRoute("/_authenticated/testen")({
  head: () => ({ meta: [{ title: "Testvragen — CeritaProject" }] }),
  component: TestPage,
});

/** Young testers' questions; parents have their own at /testlijst. */
function TestPage() {
  const { data: me } = useMe();
  const asParent = useActsAsParent();
  // Wait for the account before deciding, or a parent would be sent away while it loads.
  if (!me) return <p className="pt-6 text-sm text-muted-foreground">Laden…</p>;
  if (asParent) return <Navigate to="/testlijst" replace />;
  return <TestForm role="jongere" />;
}
