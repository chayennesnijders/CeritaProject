import { createFileRoute } from "@tanstack/react-router";
import { AdminPanel } from "@/components/AdminPanel";

export const Route = createFileRoute("/_authenticated/beheer")({
  head: () => ({ meta: [{ title: "Beheer — CeritaProject" }, { name: "description", content: "Beheer en moderatie van CeritaProject." }, { property: "og:title", content: "Beheer — CeritaProject" }, { property: "og:description", content: "Beheer en moderatie van CeritaProject." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: () => <AdminPanel />,
});
