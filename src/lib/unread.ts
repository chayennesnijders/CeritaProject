import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMe, ageGroupFor } from "@/lib/auth";
import { reportsQueryOptions } from "@/lib/reports";

// Ongelezen-aantallen voor de meldingtellers in de app:
// - per privégesprek + totaal (tab "Berichten", incl. openstaande verzoeken)
// - per groep + totaal (tab "Community")
// - openstaande meldingen voor beheerders (schildje "Beheer")

export type UnreadCounts = {
  dm: Record<string, number>;
  dmTotal: number;
  requests: number;
  groups: Record<string, number>;
  groupTotal: number;
  reports: number;
};

const empty: UnreadCounts = { dm: {}, dmTotal: 0, requests: 0, groups: {}, groupTotal: 0, reports: 0 };

export const sumCounts = (m: Record<string, number>) => Object.values(m).reduce((a, b) => a + b, 0);

/** Kort grote aantallen af op het badge-plantje: 100+ wordt "99+". */
export const badgeLabel = (n: number) => (n <= 0 ? "" : n > 99 ? "99+" : String(n));

export const incomingRequestCount = (rows: { user_a: string; user_b: string; requested_by: string }[], uid: string) =>
  rows.filter((c) => (c.user_a === uid || c.user_b === uid) && c.requested_by !== uid).length;

export function useUnreadCounts(): UnreadCounts {
  const { data: me } = useMe();
  const uid = me?.user.id;
  const band = me?.profile?.birthdate ? ageGroupFor(new Date(me.profile.birthdate)) : null;
  const withCommunity = !!uid && band !== "no_community" && band !== "too_young";
  const { data: reports } = useQuery(reportsQueryOptions(me?.isAdmin ? uid : undefined));

  const { data } = useQuery({
    queryKey: ["unread", uid, me?.isAdmin, withCommunity],
    enabled: !!uid,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<UnreadCounts> => {
      const out: UnreadCounts = { ...empty, dm: {}, groups: {} };
      if (withCommunity) {
        const [dm, pend, gr, muted, gmuted] = await Promise.all([
          supabase.rpc("my_dm_unread"),
          supabase.from("conversations").select("id, user_a, user_b, requested_by").eq("status", "pending").or(`user_a.eq.${uid},user_b.eq.${uid}`),
          supabase.rpc("my_group_unread"),
          supabase.from("conversation_prefs").select("conversation_id").eq("user_id", uid!).eq("muted", true),
          supabase.from("group_prefs").select("group_id").eq("user_id", uid!).eq("muted", true),
        ]);
        const mutedSet = new Set((muted.data ?? []).map((x) => x.conversation_id));
        for (const r of dm.data ?? []) {
          const n = r.unread ?? 0;
          if (n > 0 && !mutedSet.has(r.conversation_id)) {
            out.dm[r.conversation_id] = n;
            out.dmTotal += n;
          }
        }
        // Gedempte gesprekken horen niet bij het totaal op de tab.
        out.requests = uid ? incomingRequestCount(pend.data ?? [], uid) : 0;
        const gmutedSet = new Set((gmuted.data ?? []).map((x) => x.group_id));
        for (const r of gr.data ?? []) {
          const n = r.unread ?? 0;
          if (n > 0 && !gmutedSet.has(r.group_id)) {
            out.groups[r.group_id] = n;
            out.groupTotal += n;
          }
        }
      }
      return out;
    },
  });
  return { ...(data ?? empty), reports: me?.isAdmin ? reports?.length ?? 0 : 0 };
}
