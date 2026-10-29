import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { HOUSE_RULES } from "@/lib/legal";

export const Route = createFileRoute("/huisregels")({
  head: () => ({
    meta: [
      { title: "Huisregels — CeritaProject" },
      { name: "description", content: HOUSE_RULES.intro },
    ],
  }),
  component: () => <LegalPage page={HOUSE_RULES} />,
});
