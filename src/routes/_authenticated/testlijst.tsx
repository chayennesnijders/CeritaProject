import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMe } from "@/lib/auth";
import { useActsAsParent } from "@/lib/parent-view";
import { useActsAsTeacher } from "@/lib/teacher-view";
import { TestForm } from "@/components/TestForm";

export const Route = createFileRoute("/_authenticated/testlijst")({
  head: () => ({ meta: [{ title: "Testvragen voor ouders — CeritaProject" }] }),
  component: TestListPage,
});

/** Test questions for parents and teachers (the link testers get). Young people have theirs at /testen. */
function TestListPage() {
  const { data: me } = useMe();
  const asParent = useActsAsParent();
  const asTeacher = useActsAsTeacher();
  // Wait for the account before deciding, or a parent would be sent away while it loads.
  if (!me) return <p className="pt-6 text-sm text-muted-foreground">Laden…</p>;
  if (asTeacher) return <TestForm role="leraar" />;
  if (!asParent) return <Navigate to="/testen" replace />;
  return <TestForm role="ouder" />;
}
