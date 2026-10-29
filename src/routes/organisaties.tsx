import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { ORGANISATIONS } from "@/lib/legal";

export const Route = createFileRoute("/organisaties")({
  head: () => ({
    meta: [
      { title: "Voor organisaties — CeritaProject" },
      { name: "description", content: ORGANISATIONS.intro },
    ],
  }),
  component: () => <LegalPage page={ORGANISATIONS} />,
});
