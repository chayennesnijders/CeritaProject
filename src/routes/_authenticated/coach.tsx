import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { QuestionsAdmin } from "@/components/QuestionsAdmin";

export const Route = createFileRoute("/_authenticated/coach")({
  head: () => ({
    meta: [
      { title: "Coach — CeritaProject" },
      { name: "description", content: "Beantwoord anonieme vragen van jongeren." },
    ],
  }),
  component: CoachPage,
});

/** The coach's own page: anonymous questions to answer. */
function CoachPage() {
  const { data: me } = useMe();
  const uid = me?.user.id;
  const { data: coach, isLoading } = useQuery({
    queryKey: ["me-coach", uid],
    enabled: !!uid,
    queryFn: async () =>
      (await supabase.from("coaches").select("title, active").eq("user_id", uid!).maybeSingle())
        .data,
  });
  if (isLoading) return <p className="pt-6 text-sm text-muted-foreground">Laden…</p>;
  if (!me?.isAdmin && !coach?.active)
    return (
      <p className="pt-6 text-sm text-muted-foreground">Deze pagina is alleen voor coaches.</p>
    );
  return (
    <div className="space-y-4 pt-2">
      <div>
        <h1 className="text-3xl">🧑‍🏫 Coach</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hoi {coach?.title ?? "coach"}! Hier staan de anonieme vragen van jongeren. Je antwoord
          komt onder jouw coachnaam. Twijfel je of iemand in gevaar is? Laat het de beheerders
          weten.
        </p>
      </div>
      <QuestionsAdmin />
    </div>
  );
}
