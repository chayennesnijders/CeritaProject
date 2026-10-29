import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { ModerationNotice } from "@/components/ModerationNotice";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "Home — CeritaProject" }, { name: "description", content: "Jouw dag, opdrachten en updates bij CeritaProject." }, { property: "og:title", content: "Home — CeritaProject" }, { property: "og:description", content: "Jouw dag, opdrachten en updates bij CeritaProject." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: HomePage,
});

function HomePage() {
  const { data: me } = useMe();
  const today = new Date().toISOString().slice(0, 10);
  const { data: challenge } = useQuery({
    queryKey: ["challenge", today],
    queryFn: async () =>
      (await supabase.from("daily_challenges").select("*").lte("challenge_date", today).order("challenge_date", { ascending: false }).limit(1).maybeSingle()).data,
  });
  const p = me?.profile;
  return (
    <div className="space-y-5 pt-2">
      <h1 className="text-3xl text-foreground">Hoi {p?.display_name ?? ""} 👋</h1>
      <ModerationNotice />
      {p && !p.birthdate && (
        <Link to="/profiel" className="block rounded-3xl bg-secondary p-5 text-secondary-foreground">
          Vul je geboortedatum in op je profiel om de community te gebruiken.
        </Link>
      )}
      <Link to="/dagboek" className="block rounded-3xl bg-warm p-6 text-blush shadow-soft">
        <p className="text-xs uppercase tracking-widest opacity-75">Opdracht van de dag</p>
        <p className="mt-3 font-display text-2xl leading-snug">{challenge?.title ?? "Schrijf vandaag in je dagboek."}</p>
        {challenge?.description && <p className="mt-2 text-sm opacity-85">{challenge.description}</p>}
        <p className="mt-3 text-sm font-semibold underline">Open je dagboek →</p>
      </Link>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/community" className="rounded-3xl bg-card p-5 shadow-soft"><p className="text-2xl">💬</p><p className="mt-2 font-semibold">Community</p><p className="text-xs text-muted-foreground">Praat mee in groepen</p></Link>
        <Link to="/diertje" className="rounded-3xl bg-accent p-5"><p className="text-2xl">🐾</p><p className="mt-2 font-semibold">Mijn diertje</p><p className="text-xs text-muted-foreground">Verzorg en zie het groeien</p></Link>
        <Link to="/ontdekken" className="rounded-3xl bg-card p-5 shadow-soft"><p className="text-2xl">📖</p><p className="mt-2 font-semibold">Verhalen</p><p className="text-xs text-muted-foreground">Lees verhalen en tips</p></Link>
        <Link to="/dagboek" className="rounded-3xl bg-card p-5 shadow-soft"><p className="text-2xl">📔</p><p className="mt-2 font-semibold">Dagboek</p><p className="text-xs text-muted-foreground">Privé, met slot</p></Link>
        <Link to="/vrienden" className="rounded-3xl bg-card p-5 shadow-soft"><p className="text-2xl">💛</p><p className="mt-2 font-semibold">Vrienden zoeken</p><p className="text-xs text-muted-foreground">Vind leden van jouw leeftijd</p></Link>
        <Link to="/shop" className="rounded-3xl bg-card p-5 shadow-soft"><p className="text-2xl">🛍️</p><p className="mt-2 font-semibold">CeritaShop</p><p className="text-xs text-muted-foreground">Binnenkort</p></Link>
      </div>
    </div>
  );
}
