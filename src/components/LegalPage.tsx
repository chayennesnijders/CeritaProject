import { Link, useRouter } from "@tanstack/react-router";
import { useMe } from "@/lib/auth";
import type { LegalPage as Page } from "@/lib/legal";

/** One public information page (privacy, house rules, terms, parents, organisations). */
export function LegalPage({ page }: { page: Page }) {
  const { data: me } = useMe();
  const router = useRouter();
  return (
    <div className="mx-auto min-h-screen max-w-md bg-background px-5 py-8">
      <button
        onClick={() =>
          window.history.length > 1 ? router.history.back() : router.navigate({ to: "/" })
        }
        className="text-sm text-primary underline"
      >
        ← Terug
      </button>
      <p className="mt-6 text-5xl">{page.emoji}</p>
      <h1 className="mt-2 text-3xl">{page.title}</h1>
      <p className="mt-3 leading-relaxed text-muted-foreground">{page.intro}</p>
      {page.draft && me?.isAdmin && (
        <p className="mt-4 rounded-2xl bg-secondary p-3 text-xs text-secondary-foreground">
          🛠️ Alleen beheerders zien dit: dit is een concept. Vul de delen tussen [haken] in
          (src/lib/legal.ts) en laat de tekst nakijken door iemand met verstand van privacyrecht.
        </p>
      )}
      <div className="mt-6 space-y-4">
        {page.sections.map((s) => (
          <section key={s.title} className="rounded-3xl bg-card p-5 shadow-soft">
            <h2 className="text-lg">{s.title}</h2>
            {s.text?.map((t) => (
              <p key={t} className="mt-2 text-sm leading-relaxed">
                {t}
              </p>
            ))}
            {s.bullets && (
              <ul className="mt-2 space-y-1.5">
                {s.bullets.map((b) => (
                  <li key={b} className="flex gap-2 text-sm leading-relaxed">
                    <span aria-hidden className="text-primary">
                      •
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      <LegalLinks className="mt-8" />
    </div>
  );
}

/** Links to all information pages, for the bottom of the landing page, login and profile. */
export function LegalLinks({ className = "" }: { className?: string }) {
  const links = [
    ["/hulp", "🆘 Hulp nodig?"],
    ["/huisregels", "Huisregels"],
    ["/privacy", "Privacy"],
    ["/voorwaarden", "Voorwaarden"],
    ["/ouders", "Voor ouders"],
    ["/organisaties", "Voor organisaties"],
  ] as const;
  return (
    <nav className={`flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs ${className}`}>
      {links.map(([to, label]) => (
        <Link key={to} to={to} className="underline opacity-80">
          {label}
        </Link>
      ))}
    </nav>
  );
}
