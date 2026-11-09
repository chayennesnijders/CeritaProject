import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { memberBandChip } from "@/lib/member-band";
import { ageOn } from "@/lib/consent";
import { UserAvatar } from "@/components/UserAvatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ROLE_LABELS: Record<string, string> = {
  owner: "👑 Eigenaar",
  admin: "🛡️ Beheerder",
  moderator: "🧹 Moderator",
};

/** Beheer: a member's profile card (who they are, since when, which groups), opened from a list. */
export function MemberProfileDialog({
  userId,
  onClose,
}: {
  userId: string | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-member", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [profile, groups, roles, coach] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name, username, avatar_url, bio, birthdate, age_group, is_parent, created_at")
          .eq("id", userId!)
          .maybeSingle(),
        supabase
          .from("group_members")
          .select("groups(id, name, emoji, is_archived)")
          .eq("user_id", userId!),
        supabase.from("user_roles").select("role").eq("user_id", userId!),
        supabase.from("coaches").select("active").eq("user_id", userId!).maybeSingle(),
      ]);
      return {
        profile: profile.data,
        groups: (groups.data ?? [])
          .map(
            (g) =>
              g.groups as { id: string; name: string; emoji: string; is_archived: boolean } | null,
          )
          .filter((g): g is NonNullable<typeof g> => !!g && !g.is_archived),
        roles: (roles.data ?? []).map((r) => r.role as string),
        coach: !!coach.data?.active,
      };
    },
  });
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [confirmParent, setConfirmParent] = useState(false);
  const [busy, setBusy] = useState(false);
  const p = data?.profile;
  // Owner only: an account made by a parent by mistake as a young person's account.
  const canMakeParent =
    !!me?.isOwner && !!p && !p.is_parent && !data.roles.some((r) => r in ROLE_LABELS) && !data.coach;

  async function makeParent() {
    if (!p) return;
    setBusy(true);
    const { data: name, error } = await supabase.rpc("admin_make_parent" as never, { _user: p.id } as never);
    setBusy(false);
    setConfirmParent(false);
    if (error) {
      const missing = error.code === "PGRST202" || /admin_make_parent/.test(error.message);
      toast.error(missing ? "Dit werkt pas nadat update-61 in Supabase is geplakt." : error.message);
      return;
    }
    toast.success(`${(name as unknown as string) ?? "Dit lid"} is nu een ouder-account 👪`);
    qc.invalidateQueries({ queryKey: ["admin-member", p.id] });
    qc.invalidateQueries({ queryKey: ["admin"] });
  }
  const today = new Date().toISOString().slice(0, 10);
  const age = p?.birthdate ? ageOn(p.birthdate, today) : null;

  return (
    <Dialog open={!!userId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="sr-only">Profiel van een lid</DialogTitle>
          <DialogDescription className="sr-only">
            Wie dit lid is en in welke groepen het zit.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Laden…</p>
        ) : !p ? (
          <p className="text-sm text-muted-foreground">Dit lid bestaat niet (meer).</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <UserAvatar path={p.avatar_url} name={p.display_name} size="size-16" userId={p.id} />
              <div className="min-w-0">
                <p className="font-display text-2xl leading-tight">{p.display_name}</p>
                <p className="text-sm text-muted-foreground">
                  {p.username ? (
                    `@${p.username}`
                  ) : (
                    <span className="font-semibold text-destructive">nog geen @gebruikersnaam</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
              {age !== null && (
                <span className="rounded-full bg-muted px-2.5 py-1">🎂 {age} jaar</span>
              )}
              <span className="rounded-full bg-muted px-2.5 py-1">
                {memberBandChip(p)}
              </span>
              <span className="rounded-full bg-muted px-2.5 py-1">
                📅 Lid sinds{" "}
                {new Date(p.created_at).toLocaleDateString("nl-NL", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              {data.roles.map((r) =>
                ROLE_LABELS[r] ? (
                  <span
                    key={r}
                    className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground"
                  >
                    {ROLE_LABELS[r]}
                  </span>
                ) : null,
              )}
              {data.coach && (
                <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                  🎓 Coach
                </span>
              )}
            </div>

            {p.bio && (
              <p className="whitespace-pre-line rounded-2xl bg-muted p-3 text-sm">{p.bio}</p>
            )}

            <div>
              <p className="text-xs font-semibold text-muted-foreground">Groepen</p>
              {data.groups.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">Nog in geen enkele groep.</p>
              ) : (
                <ul className="mt-1 space-y-1 text-sm">
                  {data.groups.map((g) => (
                    <li key={g.id}>
                      {g.emoji} {g.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {canMakeParent && (
              <div className="rounded-2xl border border-dashed p-3 text-sm">
                {!confirmParent ? (
                  <button
                    type="button"
                    className="font-semibold text-primary underline-offset-2 hover:underline"
                    onClick={() => setConfirmParent(true)}
                  >
                    👪 Omzetten naar ouder-account
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p>
                      <b>{p.display_name}</b> omzetten naar een ouder-account? Dit lid gaat uit alle
                      groepen, de geboortedatum wordt gewist en het ziet daarna alleen nog de
                      ouderomgeving. Dit kun je niet zelf terugdraaien.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={makeParent}
                        className="rounded-full bg-primary px-4 py-1.5 font-semibold text-primary-foreground disabled:opacity-60"
                      >
                        {busy ? "Bezig…" : "Ja, omzetten"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmParent(false)}
                        className="rounded-full bg-muted px-4 py-1.5 font-semibold"
                      >
                        Annuleren
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
