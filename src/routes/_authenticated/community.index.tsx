import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff, Archive, ArchiveRestore } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe, bandLabel } from "@/lib/auth";
import { groupsByBand, otherBandGroups, visibleGroups } from "@/lib/groups";
import { useUnreadCounts } from "@/lib/unread";

export const Route = createFileRoute("/_authenticated/community/")({
  head: () => ({ meta: [{ title: "Community — CeritaProject" }, { name: "description", content: "Ontmoet je eigen leeftijdsgroep in de CeritaProject-community." }, { property: "og:title", content: "Community — CeritaProject" }, { property: "og:description", content: "Ontmoet je eigen leeftijdsgroep in de CeritaProject-community." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: CommunityPage,
});

function CommunityPage() {
  const { data: me } = useMe();
  const unread = useUnreadCounts();
  const uid = me?.user.id;
  const qc = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const [showAllBands, setShowAllBandsRaw] = useState(() => {
    try { return localStorage.getItem("cerita-show-all-bands") === "1"; } catch { return false; }
  });
  const setShowAllBands = (v: boolean) => {
    setShowAllBandsRaw(v);
    try { localStorage.setItem("cerita-show-all-bands", v ? "1" : "0"); } catch { /* ignore */ }
  };

  // Openstaande groepsuitnodigingen voor mijzelf.
  const { data: invites = [] } = useQuery({
    queryKey: ["group-invites", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase.from("group_invites")
        .select("id, group_id, group:groups(id, name, emoji, description), inviter:profiles!group_invites_inviter_id_fkey(display_name)")
        .eq("invitee_id", uid!).eq("status", "pending").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["groups", uid],
    enabled: !!uid,
    queryFn: async () => {
      const [g, pr] = await Promise.all([
        supabase.from("groups").select("*, group_members(count)").eq("is_archived", false).order("name"),
        supabase.from("group_prefs").select("group_id, muted, archived").eq("user_id", uid!),
      ]);
      const prefs = Object.fromEntries((pr.data ?? []).map((x) => [x.group_id, x]));
      return { groups: g.data ?? [], prefs };
    },
  });

  async function respondInvite(inviteId: string, accept: boolean) {
    const { data: res, error } = await supabase.rpc("respond_group_invite", { p_invite: inviteId, p_accept: accept });
    if (error || res !== "ok") toast.error(error ? "Dat lukte niet" : "Deze uitnodiging bestaat niet meer");
    else toast[accept ? "success" : "success"](accept ? "Je bent nu lid van de groep 🎉" : "Uitnodiging geweigerd");
    qc.invalidateQueries({ queryKey: ["group-invites", uid] });
    qc.invalidateQueries({ queryKey: ["groups", uid] });
  }

  async function setPref(groupId: string, patch: { muted?: boolean; archived?: boolean }) {
    const cur = data?.prefs[groupId];
    const { error } = await supabase.from("group_prefs").upsert({
      user_id: uid!, group_id: groupId,
      muted: patch.muted ?? cur?.muted ?? false, archived: patch.archived ?? cur?.archived ?? false,
    });
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["groups", uid] });
  }

  const all = data?.groups ?? [];
  const inBand = visibleGroups(all, { ageGroup: me?.profile?.age_group, isAdmin: me?.isAdmin });
  const others = otherBandGroups(all, { ageGroup: me?.profile?.age_group });
  const visible = showAllBands ? all : inBand;
  const groups = visible.filter((g) => !data?.prefs[g.id]?.archived);
  const archived = visible.filter((g) => data?.prefs[g.id]?.archived);

  const row = (g: (typeof all)[number], isArchived: boolean) => (
    <div key={g.id} className={`flex items-center gap-4 rounded-3xl p-4 ${isArchived ? "bg-muted" : "bg-card shadow-soft"}`}>
      <Link to="/community/$groupId" params={{ groupId: g.id }} className="flex flex-1 items-center gap-4">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-2xl">{g.emoji}</span>
        <div className="flex-1">
          <p className="font-semibold">{g.name}{data?.prefs[g.id]?.muted && <span className="ml-1 text-xs">🔕</span>}{me?.isAdmin && <span className="ml-2 text-xs text-muted-foreground">({g.age_group})</span>}</p>
          <p className="text-xs text-muted-foreground">{g.description}</p>
        </div>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">{(g.group_members as unknown as { count: number }[])?.[0]?.count ?? 0} leden{unread.groups[g.id] ? <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">{unread.groups[g.id]}</span> : null}</span>
      </Link>
      <div className="flex flex-col gap-1">
        <button aria-label={data?.prefs[g.id]?.muted ? "Dempen uit" : "Dempen"} onClick={() => setPref(g.id, { muted: !data?.prefs[g.id]?.muted })} className="text-muted-foreground">
          {data?.prefs[g.id]?.muted ? <BellOff className="size-4" /> : <Bell className="size-4" />}
        </button>
        <button aria-label={isArchived ? "Uit archief" : "Archiveren"} onClick={() => setPref(g.id, { archived: !isArchived })} className="text-muted-foreground">
          {isArchived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="pt-2">
      <h1 className="text-3xl">Community</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {me?.profile?.birthdate ? `Groepen voor jouw leeftijd (${bandLabel(me.profile.age_group)})` : "Vul eerst je geboortedatum in op je profiel."}
      </p>
      {invites.length > 0 && (
        <div className="mt-4 space-y-2">
          {invites.map((inv) => {
            const g = inv.group as { name: string; emoji: string } | null;
            const by = (inv.inviter as { display_name: string } | null)?.display_name ?? "Iemand";
            return (
              <div key={inv.id} className="rounded-3xl bg-secondary p-4 text-secondary-foreground shadow-soft">
                <p className="text-sm font-semibold">👋 {by} nodigt je uit voor {g?.emoji} {g?.name}</p>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => respondInvite(inv.id, true)} className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">Accepteren</button>
                  <button onClick={() => respondInvite(inv.id, false)} className="rounded-full bg-background px-4 py-1.5 text-xs font-semibold">Weigeren</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-5 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Laden…</p>}
        {showAllBands && (
          <div className="flex items-center justify-between gap-3 rounded-3xl bg-secondary p-4 text-secondary-foreground shadow-soft">
            <p className="text-sm font-semibold">🛡️ Beheerweergave aan: je ziet nu alle leeftijdsgroepen door elkaar.</p>
            <button onClick={() => setShowAllBands(false)} className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              Alleen de mijne
            </button>
          </div>
        )}
        {showAllBands ? (
          groupsByBand(groups).map(({ band, groups: rows }) => (
            <div key={band}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Leeftijdsgroep {bandLabel(band)}</p>
              <div className="space-y-3">{rows.map((g) => row(g, false))}</div>
            </div>
          ))
        ) : (
          groups.map((g) => row(g, false))
        )}
        {archived.length > 0 && (
          <div>
            <button onClick={() => setShowArchived(!showArchived)} className="text-sm text-primary">Gearchiveerd ({archived.length}) {showArchived ? "▴" : "▾"}</button>
            {showArchived && <div className="mt-2 space-y-3">{archived.map((g) => row(g, true))}</div>}
          </div>
        )}
        {me?.isAdmin && others.length > 0 && (
          <button onClick={() => setShowAllBands(!showAllBands)} className="block text-sm text-primary">
            {showAllBands ? "▴ Toon alleen mijn leeftijdsgroep" : `▾ Toon alle groepen (${others.length} andere) — alleen voor beheer`}
          </button>
        )}
      </div>
    </div>
  );
}
