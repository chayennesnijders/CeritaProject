import { createFileRoute, Link } from "@tanstack/react-router";
import { ParentHome } from "@/components/ParentHome";
import { useChallengeDay } from "@/lib/challenges";
import { useMe } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/ouderhoek")({
  head: () => ({ meta: [{ title: "Ouderhoek — CeritaProject" }] }),
  component: ParentCornerPage,
});

/**
 * The parents' corner for young members who are parents themselves: their groups stay as they are,
 * and here they get the parents' assignment and tip of the day.
 */
function ParentCornerPage() {
  const { data: me } = useMe();
  const day = useChallengeDay();
  const p = me?.profile;
  if (!me || !p) return null;
  if (!p.also_parent && !p.is_parent)
    return (
      <div className="mt-6 space-y-3 rounded-3xl bg-card p-6 text-center shadow-soft">
        <p className="text-3xl">👶</p>
        <h1 className="text-xl">Ben jij zelf ook ouder?</h1>
        <p className="text-sm text-muted-foreground">
          Zet de ouderhoek aan bij Profiel → Mijn profiel. Je blijft gewoon in je groepen, en krijgt er elke dag een
          tip voor jou en je kind bij.
        </p>
        <Link to="/profiel" className="inline-block rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Naar mijn profiel
        </Link>
      </div>
    );
  return <ParentHome uid={me.user.id} day={day} name={p.display_name} corner={!p.is_parent} />;
}
