import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Beheer → Vragen: who are the coaches. Add one by @username, or switch a coach off. */
export function CoachesAdmin() {
  const qc = useQueryClient();
  const [username, setUsername] = useState("");
  const [title, setTitle] = useState("");
  const { data: coaches = [] } = useQuery({
    queryKey: ["coaches"],
    queryFn: async () =>
      (
        await supabase
          .from("coaches")
          .select("user_id, title, active, profile:profiles(username)")
          .order("created_at")
      ).data ?? [],
  });
  async function add() {
    const { error } = await supabase.rpc("add_coach", { _username: username, _title: title });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${title} is nu coach 🧑‍🏫`);
    setUsername("");
    setTitle("");
    qc.invalidateQueries({ queryKey: ["coaches"] });
  }
  async function setActive(userId: string, active: boolean) {
    const { error } = await supabase.from("coaches").update({ active }).eq("user_id", userId);
    toast[error ? "error" : "success"](
      error ? error.message : active ? "Weer actief" : "Coach staat uit",
    );
    qc.invalidateQueries({ queryKey: ["coaches"] });
  }

  return (
    <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
      <h2 className="text-lg">🧑‍🏫 Coaches</h2>
      <p className="text-xs text-muted-foreground">
        Een coach maakt eerst zelf een account aan in de app. Vul daarna hier de gebruikersnaam in.
        Coaches zien de vragen van alle leeftijden, maar nooit wie de vraag stelde.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="@gebruikersnaam"
          className="rounded-2xl"
        />
        <Input
          value={title}
          maxLength={40}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Coach Sanne"
          className="rounded-2xl"
        />
      </div>
      <Button
        disabled={username.trim().length < 3 || title.trim().length < 2}
        onClick={add}
        className="w-full rounded-full"
      >
        Coach toevoegen
      </Button>
      {coaches.map((c) => (
        <div key={c.user_id} className="flex items-center gap-2 rounded-2xl bg-muted p-2 text-sm">
          <span className="min-w-0 flex-1 truncate">
            {c.title}{" "}
            <span className="text-xs text-muted-foreground">
              @{(c.profile as { username?: string | null } | null)?.username ?? "?"}
            </span>
          </span>
          <button className="text-xs underline" onClick={() => setActive(c.user_id, !c.active)}>
            {c.active ? "Uitzetten" : "Aanzetten"}
          </button>
        </div>
      ))}
    </section>
  );
}
