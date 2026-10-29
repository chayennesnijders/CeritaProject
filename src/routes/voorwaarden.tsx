import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { TERMS } from "@/lib/legal";

export const Route = createFileRoute("/voorwaarden")({
  head: () => ({
    meta: [
      { title: "Gebruiksvoorwaarden — CeritaProject" },
      { name: "description", content: TERMS.intro },
    ],
  }),
  component: () => <LegalPage page={TERMS} />,
});
