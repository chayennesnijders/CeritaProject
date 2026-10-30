import { createFileRoute, Link } from "@tanstack/react-router";
import { HelpLines } from "@/components/HelpLines";
import { LegalLinks } from "@/components/LegalPage";
import { Riti } from "@/components/Riti";
import { useMe } from "@/lib/auth";

export const Route = createFileRoute("/hulp")({
  head: () => ({
    meta: [
      { title: "Hulp nodig? — CeritaProject" },
      {
        name: "description",
        content: "Gratis hulplijnen voor jongeren: 113, de Kindertelefoon, Veilig Thuis en meer.",
      },
    ],
  }),
  component: HelpPage,
});

function HelpPage() {
  const { data: me } = useMe();
  return (
    <div className="mx-auto min-h-screen max-w-md bg-background px-5 py-8">
      <Link to={me ? "/home" : "/"} className="text-sm text-primary underline">
        ← Terug
      </Link>
      <div className="mt-4 flex items-center gap-2">
        <Riti size={110} expression="troostend" />
        <div className="relative flex-1 rounded-2xl bg-card p-3 text-sm shadow-soft">
          <span
            aria-hidden
            className="absolute -left-1.5 top-1/2 size-3 -translate-y-1/2 rotate-45 bg-card"
          />
          Fijn dat je hier kijkt. Je hoeft het niet alleen te dragen. Deze mensen luisteren naar je,
          gratis en anoniem. 💛
        </div>
      </div>
      <h1 className="mt-4 text-3xl">Hulp nodig?</h1>
      <p className="mt-2 rounded-2xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">
        Ben je in direct gevaar? Bel meteen 112.
      </p>
      <div className="mt-4">
        <HelpLines />
      </div>
      <Link to="/veiligheidsplan" className="mt-4 flex items-center gap-3 rounded-3xl bg-secondary p-4 text-secondary-foreground shadow-soft">
        <span className="text-2xl">🛟</span>
        <span className="flex-1">
          <span className="block text-sm font-semibold">Mijn veiligheidsplan</span>
          <span className="block text-xs">Jouw eigen plan voor als het even niet goed gaat (alleen voor leden, privé)</span>
        </span>
        <span>→</span>
      </Link>

      <section className="mt-6 rounded-3xl bg-card p-5 shadow-soft">
        <h2 className="text-lg">Even rustig worden 🌿</h2>
        <ol className="mt-2 space-y-1.5 text-sm leading-relaxed">
          <li>1. Adem 4 tellen in door je neus.</li>
          <li>2. Houd 4 tellen vast.</li>
          <li>3. Adem 6 tellen uit door je mond.</li>
          <li>4. Doe dit 5 keer. Noem daarna 3 dingen die je ziet.</li>
        </ol>
      </section>

      {me && (
        <Link
          to="/contact"
          className="mt-4 block rounded-3xl border-2 border-primary bg-card p-4 text-sm font-semibold shadow-soft"
        >
          💌 Of stuur de beheerders van CeritaProject een bericht →
        </Link>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        De beheerders van CeritaProject zijn geen hulpverleners en lezen berichten niet altijd
        meteen. Bij zorgen over je veiligheid: bel de nummers hierboven.
      </p>
      <LegalLinks className="mt-8" />
    </div>
  );
}
