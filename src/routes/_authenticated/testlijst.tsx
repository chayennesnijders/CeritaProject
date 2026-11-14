import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMe } from "@/lib/auth";
import { useActsAsParent } from "@/lib/parent-view";
import { TestForm } from "@/components/TestForm";

export const Route = createFileRoute("/_authenticated/testlijst")({
  head: () => ({ meta: [{ title: "Testvragen voor ouders — CeritaProject" }] }),
  component: TestListPage,
});

/** Parents' test questions (the link testers get). Young people have their own at /testen. */
function TestListPage() {
  const { data: me } = useMe();
  const asParent = useActsAsParent();
  // Wait for the account before deciding, or a parent would be sent away while it loads.
  if (!me) return <p className="pt-6 text-sm text-muted-foreground">Laden…</p>;
  if (!asParent) return <Navigate to="/testen" replace />;
  return <TestForm role="ouder" />;
}
