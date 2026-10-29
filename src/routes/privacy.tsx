import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { PRIVACY } from "@/lib/legal";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacyverklaring — CeritaProject" },
      { name: "description", content: PRIVACY.intro },
    ],
  }),
  component: () => <LegalPage page={PRIVACY} />,
});
