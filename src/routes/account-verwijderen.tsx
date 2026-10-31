import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { ACCOUNT_DELETION } from "@/lib/legal";

export const Route = createFileRoute("/account-verwijderen")({
  head: () => ({
    meta: [
      { title: "Account verwijderen — CeritaProject" },
      { name: "description", content: ACCOUNT_DELETION.intro },
    ],
  }),
  component: () => <LegalPage page={ACCOUNT_DELETION} />,
});
