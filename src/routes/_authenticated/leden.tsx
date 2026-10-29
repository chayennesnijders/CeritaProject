import { createFileRoute } from "@tanstack/react-router";
import { AdminPanel } from "@/components/AdminPanel";

export const Route = createFileRoute("/_authenticated/leden")({
  head: () => ({ meta: [{ title: "Leden — CeritaProject" }, { name: "description", content: "Ledenbeheer, waarschuwingen en time-outs bij CeritaProject." }, { property: "og:title", content: "Leden — CeritaProject" }, { property: "og:description", content: "Ledenbeheer, waarschuwingen en time-outs bij CeritaProject." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: () => <AdminPanel ledenOnly />,
});
