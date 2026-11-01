import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { challengeDay } from "@/lib/challenges";
import { mondayOf } from "@/lib/group-challenge";
import { sameFeelingText } from "@/lib/group-checkin";
import { MOODS } from "@/lib/home";
import { celebrate } from "@/lib/celebrate";

/**
 * "Hoe gaat het deze week met je?": a weekly check-in in every group. You tap how you feel; after
 * that you see how many feel the same, as totals only (never who).
 */
export function GroupCheckIn({
  groupId,
  uid,
  isMember,
}: {
  groupId: string;
  uid: string | undefined;
  isMember: boolean;
}) {
  const qc = useQueryClient();
  const week = mondayOf(challengeDay());
  const key = ["group-checkin", groupId, week, uid];
  const { data } = useQuery({
    queryKey: key,
    enabled: !!uid,
    queryFn: async () => {
      const [mine, totals] = await Promise.all([
        supabase
          .from("group_checkins")
          .select("mood")
          .eq("group_id", groupId)
          .eq("week", week)
          .eq("user_id", uid!)
          .maybeSingle(),
        supabase.rpc("group_checkin_totals", { _group: groupId, _week: week }),
      ]);
      return { mine: mine.data?.mood ?? null, totals: totals.data ?? [], missing: !!totals.error };
    },
  });
  if (!data || data.missing) return null;

  async function pick(mood: string) {
    if (!uid || !isMember) return;
    const { error } = await supabase
      .from("group_checkins")
      .upsert(
        { group_id: groupId, user_id: uid, week, mood },
        { onConflict: "group_id,user_id,week" },
      );
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data?.mine) celebrate("klein", { set: "hartjes" });
    qc.invalidateQueries({ queryKey: key });
  }

  return (
    <section className="rounded-3xl bg-card p-4 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        💬 Check-in van de week
      </p>
      <p className="mt-1 font-semibold">Hoe gaat het deze week met je?</p>
      <div className="mt-2 grid grid-cols-5 gap-1">
        {MOODS.map((m) => (
          <button
            key={m.id}
            disabled={!isMember}
            onClick={() => pick(m.id)}
            className={`flex flex-col items-center rounded-2xl py-2 text-[10px] font-semibold active:scale-95 disabled:opacity-50 ${data.mine === m.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            <span className="text-2xl">{m.emoji}</span>
            {m.label}
          </button>
        ))}
      </div>
      {data.mine ? (
        <div className="mt-3 space-y-1.5">
          <p className="text-xs font-semibold">{sameFeelingText(data.mine, data.totals)}</p>
          <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
            {MOODS.map((m) => (
              <span key={m.id}>
                {m.emoji} {data.totals.find((t) => t.mood === m.id)?.total ?? 0}
              </span>
            ))}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Niemand ziet wat jij hebt gekozen. Je ziet alleen de totalen.
          </p>
        </div>
      ) : (
        !isMember && (
          <p className="mt-2 text-xs text-muted-foreground">
            Word lid van de groep om mee te doen.
          </p>
        )
      )}
    </section>
  );
}
