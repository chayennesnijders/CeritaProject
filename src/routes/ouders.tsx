import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { PARENTS } from "@/lib/legal";

export const Route = createFileRoute("/ouders")({
  head: () => ({
    meta: [
      { title: "Voor ouders en verzorgers — CeritaProject" },
      { name: "description", content: PARENTS.intro },
    ],
  }),
  component: () => <LegalPage page={PARENTS} />,
});
