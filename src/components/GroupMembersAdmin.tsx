import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserMinus, UserPlus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { notifyGroupInvite } from "@/lib/push.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = { groupId: string; ageGroup: "junior" | "senior" | "adult"; mode?: "admin" | "member" };

/** Beheerder: leden bekijken, uitnodigen en verwijderen. Lid: iemand uitnodigen. */
export function GroupMembersAdmin({ groupId, ageGroup, mode = "admin" }: Props) {
  const isAdmin = mode === "admin";
  const qc = useQueryClient();
  const notifyInvite = useServerFn(notifyGroupInvite);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [invited, setInvited] = useState<Set<string>>(new Set());

  const { data: members = [] } = useQuery({
    queryKey: ["group-members", groupId],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from("group_members")
        .select("user_id, joined_at, profile:profiles(display_name, username)").eq("group_id", groupId);
      return data ?? [];
    },
  });

  const term = q.trim().replace(/^@/, "");
  const { data: results = [] } = useQuery({
    queryKey: ["group-invite-search", groupId, term],
    enabled: open && term.length >= 2,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, display_name, username")
        .eq("age_group", ageGroup)
        .or(`display_name.ilike.%${term}%,username.ilike.%${term}%`).limit(8);
      return data ?? [];
    },
  });

  const memberIds = new Set(members.map((m) => m.user_id));
  const refresh = () => qc.invalidateQueries({ queryKey: ["group-members", groupId] });

  async function invite(userId: string) {
    if (isAdmin) {
      const { error } = await supabase.from("group_members").insert({ group_id: groupId, user_id: userId });
      if (error) toast.error("Uitnodigen lukte niet (andere leeftijdsgroep?)");
      else toast.success("Lid toegevoegd aan de groep");
      refresh();
      return;
    }
    const { data: created, error } = await supabase.from("group_invites")
      .insert({ group_id: groupId, inviter_id: (await supabase.auth.getUser()).data.user?.id!, invitee_id: userId })
      .select("id").single();
    if (error) toast.error("Uitnodigen lukte niet (al lid of al uitgenodigd?)");
    else {
      toast.success("Uitnodiging verstuurd 👋");
      setInvited((s) => new Set(s).add(userId));
      notifyInvite({ data: { inviteId: created!.id } }).catch(() => {});
    }
  }
  async function remove(userId: string) {
    if (!confirm("Dit lid uit de groep verwijderen?")) return;
    const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId);
    toast[error ? "error" : "success"](error ? "Verwijderen lukte niet" : "Lid verwijderd");
    refresh();
  }

  if (!open) return (
    <Button variant="outline" onClick={() => setOpen(true)} className="mt-3 w-full rounded-full">
      <Users className="size-4" />{isAdmin ? "Leden beheren" : "Iemand uitnodigen"}
    </Button>
  );

  return (
    <div className="mt-3 rounded-3xl bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <h2 className="text-base">{isAdmin ? "🛡️" : "👋"} {isAdmin ? `Leden (${members.length})` : "Iemand uitnodigen"}</h2>
        <button className="text-xs text-muted-foreground" onClick={() => setOpen(false)}>Sluiten</button>
      </div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={isAdmin ? "Nodig uit: naam of @gebruikersnaam" : "Zoek op naam of @gebruikersnaam"} className="mt-3 rounded-full" />
      {term.length >= 2 && (
        <ul className="mt-2 space-y-1">
          {results.filter((r) => !memberIds.has(r.id)).map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-sm">
              <span>{r.display_name}{r.username && <span className="text-muted-foreground"> @{r.username}</span>}</span>
              {invited.has(r.id) ? (
                <span className="text-xs text-muted-foreground">Verstuurd ✓</span>
              ) : (
                <Button size="sm" className="rounded-full" onClick={() => invite(r.id)}><UserPlus className="size-4" />Uitnodigen</Button>
              )}
            </li>
          ))}
          {results.length === 0 && <li className="text-xs text-muted-foreground">Niemand gevonden in deze leeftijdsgroep.</li>}
        </ul>
      )}
      {isAdmin && (
        <ul className="mt-3 space-y-1">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center justify-between rounded-xl px-3 py-2 text-sm">
              <span>{m.profile?.display_name ?? "Lid"}{m.profile?.username && <span className="text-muted-foreground"> @{m.profile.username}</span>}</span>
              <button aria-label="Verwijderen" onClick={() => remove(m.user_id)} className="p-1 text-destructive"><UserMinus className="size-4" /></button>
            </li>
          ))}
          {members.length === 0 && <li className="text-xs text-muted-foreground">Nog geen leden.</li>}
        </ul>
      )}
      {!isAdmin && <p className="mt-3 text-xs text-muted-foreground">De ander krijgt een melding en kan zelf accepteren of weigeren. Alleen leden uit dezelfde leeftijdsgroep.</p>}
    </div>
  );
}
