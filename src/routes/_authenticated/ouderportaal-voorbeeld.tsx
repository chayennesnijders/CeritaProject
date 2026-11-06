import { createFileRoute, Link } from "@tanstack/react-router";
import { ParentHome } from "@/components/ParentHome";
import { useMe } from "@/lib/auth";
import { useChallengeDay } from "@/lib/challenges";

export const Route = createFileRoute("/_authenticated/ouderportaal-voorbeeld")({
  head: () => ({ meta: [{ title: "Voorbeeld ouderportaal — CeritaProject" }] }),
  component: ParentPortalPreview,
});

/** For admins: the parents' home screen exactly as a parent sees it, without saving anything. */
function ParentPortalPreview() {
  const { data: me } = useMe();
  const day = useChallengeDay();
  if (!me) return null;
  if (!me.isAdmin)
    return <p className="pt-6 text-sm text-muted-foreground">Deze pagina is alleen voor beheerders.</p>;
  return (
    <div className="space-y-3">
      <div className="mt-2 flex items-center gap-2 rounded-2xl bg-[#fff4d6] p-3 text-xs text-[#5c4300]">
        <span className="flex-1">
          👀 <b>Voorbeeld.</b> Zo ziet een ouder het startscherm. Knoppen werken, maar er wordt niets bewaard.
        </span>
        <Link to="/beheer" className="shrink-0 font-semibold underline">
          Terug
        </Link>
      </div>
      <ParentHome uid={me.user.id} day={day} name="Sandra" preview />
    </div>
  );
}
