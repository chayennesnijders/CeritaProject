import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { LegalLinks } from "@/components/LegalPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CeritaProject — jouw veilige plek om verhalen te delen" },
      { name: "description", content: "De app van CeritaProject: verhalen delen, community, artikelen en groeien in een veilige omgeving voor jongeren van 12 tot 27." },
      { property: "og:title", content: "CeritaProject — jouw veilige plek" },
      { property: "og:description", content: "Verhalen delen, community en persoonlijke groei voor jongeren van 12 tot 27." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-between bg-warm px-6 py-10 text-blush">
      <img src="/cerita-logo.png" alt="CeritaProject — jouw verhaal mag er zijn" className="mx-auto size-44 rounded-[2.5rem] shadow-lg" />
      <div>
        <h1 className="text-5xl font-bold leading-tight">Jouw verhaal telt.</h1>
        <p className="mt-4 text-lg opacity-90">
          Een veilige plek om te delen, te lezen, contact te maken en te groeien. Voor jongeren van 12 tot 27.
        </p>
      </div>
      <div className="space-y-3">
        <Button asChild size="lg" className="h-14 w-full rounded-full bg-secondary text-base text-secondary-foreground hover:bg-secondary/90">
          <Link to="/auth">Beginnen</Link>
        </Button>
        <p className="text-center text-xs opacity-75">Leeftijdsgroepen 12–15, 16–25 en 26–27 hebben elk hun eigen omgeving.</p>
        <LegalLinks className="pt-2" />
      </div>
    </div>
  );
}
