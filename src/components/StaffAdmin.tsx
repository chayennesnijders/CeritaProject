import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { normalizeUsername } from "@/lib/username";
import { Button } from "@/components/ui/button";

const ROLE_LABEL = {
  owner: "Eigenaar",
  admin: "Beheerder",
  moderator: "Moderator",
} as const;

/**
 * Beheer → Team (owner only): make a member moderator by @username, or take it away again.
 * Moderators only see the Inbox and messages from members; the database checks this too.
 */
export function StaffAdmin() {
  const qc = useQueryClient();
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const { data: staff = [], error } = useQuery({
    queryKey: ["staff-list"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("staff_list");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function setModerator(name: string, on: boolean) {
    setBusy(true);
    const { data, error: err } = await supabase.rpc("set_moderator", { _username: name, _on: on });
    setBusy(false);
    setConfirmRemove(null);
    if (err) {
      const missing = err.code === "PGRST202" || /could not find the function/i.test(err.message);
      toast.error(missing ? "Dit werkt pas nadat update-29 in Supabase is geplakt." : err.message);
      return;
    }
    toast.success(on ? `${data} is nu moderator 🛡️` : `${data} is geen moderator meer`);
    setUsername("");
    qc.invalidateQueries({ queryKey: ["staff-list"] });
    qc.invalidateQueries({ queryKey: ["admin-ids"] });
  }

  return (
    <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
      <h2 className="text-lg">👥 Team</h2>
      <p className="text-xs text-muted-foreground">
        Maak iemand <strong>moderator</strong>. Een moderator ziet in Beheer alleen de{" "}
        <strong>Inbox</strong> (meldingen, zorgsignalen, waarschuwingen en time-outs) en de{" "}
        <strong>berichten van leden</strong>. Berichten van organisaties, de shop, cijfers en de
        rest van Beheer ziet een moderator niet.
      </p>
      <div className="flex gap-2">
        <label className="flex h-10 min-w-0 flex-1 items-center rounded-2xl border border-input bg-background px-3">
          <span className="text-muted-foreground">@</span>
          <input
            aria-label="Gebruikersnaam"
            value={username}
            maxLength={20}
            autoCapitalize="none"
            placeholder="gebruikersnaam"
            onChange={(e) => setUsername(normalizeUsername(e.target.value))}
            className="h-full min-w-0 flex-1 bg-transparent px-1 outline-none"
          />
        </label>
        <Button
          disabled={busy || username.length < 3}
          onClick={() => setModerator(username, true)}
          className="shrink-0 rounded-full"
        >
          Maak moderator
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Was iemand al volledig beheerder? Dan wordt die nu moderator en ziet die alleen nog de
        Inbox.
      </p>

      {error && (
        <p className="text-sm text-destructive">
          Het team laden lukte niet. Is update-29 al in Supabase geplakt?
        </p>
      )}
      <div className="space-y-2">
        {staff.map((m) => {
          const isOwner = m.roles.includes("owner");
          const label = isOwner
            ? ROLE_LABEL.owner
            : m.roles.includes("admin")
              ? ROLE_LABEL.admin
              : ROLE_LABEL.moderator;
          return (
            <div key={m.user_id} className="rounded-2xl bg-muted p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-semibold">{m.display_name}</span>{" "}
                  <span className="text-xs text-muted-foreground">
                    {m.username ? `@${m.username}` : "nog geen @"}
                  </span>
                </span>
                <span className="rounded-full bg-card px-2 py-0.5 text-xs font-semibold">
                  {label}
                </span>
              </div>
              {!isOwner && m.username && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {m.roles.includes("admin") && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      className="rounded-full"
                      onClick={() => setModerator(m.username!, true)}
                    >
                      Alleen Inbox (moderator)
                    </Button>
                  )}
                  {confirmRemove === m.user_id ? (
                    <>
                      <span className="self-center text-xs">Zeker weten?</span>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busy}
                        className="rounded-full"
                        onClick={() => setModerator(m.username!, false)}
                      >
                        Ja, haal weg
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full"
                        onClick={() => setConfirmRemove(null)}
                      >
                        Nee
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-full"
                      onClick={() => setConfirmRemove(m.user_id)}
                    >
                      Uit het team halen
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
