import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Beheer → Vragen: who are the coaches. Add one by @username, or switch a coach off. */
export function CoachesAdmin() {
  const qc = useQueryClient();
  const { data: me } = useMe();
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
  // The coach name is optional: "Coach Chayenne" from the username.
  const defaultTitle = (u: string) => {
    const n = u.trim().replace(/^@/, "");
    return n ? `Coach ${n.charAt(0).toUpperCase()}${n.slice(1)}` : "";
  };
  async function add(u = username, t = title) {
    const name = t.trim() || defaultTitle(u);
    const { error } = await supabase.rpc("add_coach", { _username: u.trim(), _title: name });
    if (error) {
      const missing =
        error.code === "PGRST202" || /could not find the function/i.test(error.message);
      toast.error(
        missing ? "Dit werkt pas nadat update-27 in Supabase is geplakt." : error.message,
      );
      return;
    }
    toast.success(`${name} is nu coach 🎓`);
    setUsername("");
    setTitle("");
    qc.invalidateQueries({ queryKey: ["coaches"] });
    qc.invalidateQueries({ queryKey: ["me"] });
    qc.invalidateQueries({ queryKey: ["coach-ids"] });
  }
  function makeMeCoach() {
    const mine = me?.profile?.username;
    if (!mine) {
      toast.error("Kies eerst een gebruikersnaam bij Profiel → Mijn profiel en tik op Opslaan.");
      return;
    }
    void add(mine, "");
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
          placeholder="Coachnaam (mag leeg)"
          className="rounded-2xl"
        />
      </div>
      <Button
        disabled={username.trim().replace(/^@/, "").length < 3}
        onClick={() => add()}
        className="w-full rounded-full"
      >
        Coach toevoegen
      </Button>
      {!coaches.some((c) => c.user_id === me?.user.id && c.active) && (
        <Button variant="outline" onClick={makeMeCoach} className="w-full rounded-full">
          🎓 Maak mij coach (om te kijken hoe het eruitziet)
        </Button>
      )}
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
