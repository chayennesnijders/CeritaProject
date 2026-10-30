import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { challengeDay } from "@/lib/challenges";
import {
  GROUP_CHALLENGE_GOAL,
  GROUP_CHALLENGE_XP,
  challengeForWeek,
  mondayOf,
} from "@/lib/group-challenge";

/** The week's challenge at the top of a group chat: tick it off together and earn XP for your pet. */
export function GroupChallenge({
  groupId,
  uid,
  isMember,
}: {
  groupId: string;
  uid: string | undefined;
  isMember: boolean;
}) {
  const qc = useQueryClient();
  const today = challengeDay();
  const monday = mondayOf(today);
  const c = challengeForWeek(monday);
  const [open, setOpen] = useState(false);
  const key = ["group-challenge", groupId, monday, uid];
  const { data } = useQuery({
    queryKey: key,
    enabled: !!uid,
    queryFn: async () => {
      const [ticks, claim] = await Promise.all([
        supabase
          .from("group_challenge_checkins")
          .select("user_id, day")
          .eq("group_id", groupId)
          .gte("day", monday),
        supabase
          .from("group_challenge_claims")
          .select("week")
          .eq("group_id", groupId)
          .eq("user_id", uid!)
          .eq("week", monday)
          .maybeSingle(),
      ]);
      return { ticks: ticks.data ?? [], claimed: !!claim.data };
    },
  });
  useEffect(() => {
    const ch = supabase
      .channel(`challenge-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_challenge_checkins",
          filter: `group_id=eq.${groupId}`,
        },
        () => qc.invalidateQueries({ queryKey: ["group-challenge", groupId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [groupId, qc]);

  const count = data?.ticks.length ?? 0;
  const doneToday = !!data?.ticks.some((t) => t.user_id === uid && t.day === today);
  const helped = !!data?.ticks.some((t) => t.user_id === uid);
  const reached = count >= GROUP_CHALLENGE_GOAL;
  const refresh = () => qc.invalidateQueries({ queryKey: ["group-challenge", groupId] });

  async function tick() {
    const { error } = await supabase.rpc("checkin_group_challenge", { _group: groupId });
    if (error) {
      toast.error(error.message);
      return;
    }
    navigator.vibrate?.(20);
    toast.success("Goed gedaan! 💪");
    refresh();
  }
  async function claim() {
    const { data: xp, error } = await supabase.rpc("claim_group_challenge", { _group: groupId });
    if (error || !xp) {
      toast.error("Ophalen lukte niet.");
      return;
    }
    toast.success(`+${xp} XP voor je diertje! 🐾`);
    refresh();
  }

  return (
    <div className="rounded-2xl bg-secondary/70 p-3 text-secondary-foreground shadow-soft">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 text-left">
        <span className="text-2xl">{c.emoji}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-wide opacity-70">
            Weekuitdaging
          </span>
          <span className="block truncate text-sm font-semibold">{c.text}</span>
        </span>
        <span className="shrink-0 text-xs font-bold">
          {Math.min(count, GROUP_CHALLENGE_GOAL)}/{GROUP_CHALLENGE_GOAL} {reached ? "🎉" : ""}
        </span>
      </button>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-background/60">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.min(100, (count / GROUP_CHALLENGE_GOAL) * 100)}%` }}
        />
      </div>
      {open && (
        <div className="mt-2 space-y-2 text-xs">
          <p>
            Doe het samen! Iedereen mag het één keer per dag afvinken. Bij {GROUP_CHALLENGE_GOAL}{" "}
            keer krijgt iedereen die meedeed {GROUP_CHALLENGE_XP} XP voor zijn of haar diertje.
          </p>
          {isMember && !reached && (
            <button
              disabled={doneToday}
              onClick={tick}
              className="w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {doneToday ? "✓ Vandaag gedaan" : "Ik heb het vandaag gedaan ✓"}
            </button>
          )}
          {isMember && reached && helped && !data?.claimed && (
            <button
              onClick={claim}
              className="w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              🐾 Haal je {GROUP_CHALLENGE_XP} XP op
            </button>
          )}
          {reached && (data?.claimed || !helped) && (
            <p className="font-semibold">
              {data?.claimed
                ? "Je beloning is binnen. Volgende week een nieuwe uitdaging!"
                : "Gehaald door de groep! Doe volgende week ook mee."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
