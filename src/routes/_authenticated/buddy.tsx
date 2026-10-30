import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { UserAvatar } from "@/components/UserAvatar";
import { INTERESTS, interestById, MAX_INTERESTS, toggleInterest } from "@/lib/buddy";
import { notifyChatRequest } from "@/lib/push.functions";

export const Route = createFileRoute("/_authenticated/buddy")({
  head: () => ({
    meta: [
      { title: "Buddy zoeken — CeritaProject" },
      { name: "description", content: "Vind een buddy van jouw leeftijd met dezelfde interesses." },
    ],
  }),
  component: BuddyPage,
});

/** Pick interests, then meet members of your age band who like the same things. Both must say yes to chat. */
function BuddyPage() {
  const { data: me } = useMe();
  const uid = me?.user.id;
  const qc = useQueryClient();
  const nav = useNavigate();
  const notify = useServerFn(notifyChatRequest);
  const [interests, setInterests] = useState<string[]>([]);
  const [looking, setLooking] = useState(true);
  const [sent, setSent] = useState<Set<string>>(new Set());

  const { data: profile } = useQuery({
    queryKey: ["buddy-profile", uid],
    enabled: !!uid,
    queryFn: async () =>
      (
        await supabase
          .from("buddy_profiles")
          .select("interests, looking")
          .eq("user_id", uid!)
          .maybeSingle()
      ).data,
  });
  useEffect(() => {
    if (profile) {
      setInterests(profile.interests);
      setLooking(profile.looking);
    }
  }, [profile]);
  const { data: matches = [] } = useQuery({
    queryKey: ["buddy-suggestions", uid, profile?.interests.join(","), profile?.looking],
    enabled: !!uid && !!profile?.looking,
    queryFn: async () => (await supabase.rpc("buddy_suggestions")).data ?? [],
  });

  async function save(next: string[], nextLooking: boolean) {
    setInterests(next);
    setLooking(nextLooking);
    if (!uid) return;
    const { error } = await supabase.from("buddy_profiles").upsert({
      user_id: uid,
      interests: next,
      looking: nextLooking,
      updated_at: new Date().toISOString(),
    });
    if (error) toast.error("Opslaan lukte niet.");
    qc.invalidateQueries({ queryKey: ["buddy-profile", uid] });
  }
  async function ask(other: string) {
    if (!uid) return;
    const [a, b] = [uid, other].sort();
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_a: a!, user_b: b!, requested_by: uid })
      .select("id")
      .single();
    if (error) {
      toast.error("Verzoek sturen lukte niet.");
      return;
    }
    setSent(new Set(sent).add(other));
    toast.success("Buddy-verzoek verstuurd! Als de ander ja zegt, kunnen jullie chatten.");
    if (data) notify({ data: { convId: data.id } }).catch(() => {});
  }

  return (
    <div className="space-y-4 pt-2">
      <div>
        <h1 className="text-3xl">🤝 Buddy zoeken</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Een buddy is iemand van jouw leeftijd om mee te kletsen en elkaar te steunen. Kies wat jij
          leuk vindt, dan laten we leden zien die dat ook leuk vinden.
        </p>
      </div>
      <section className="space-y-3 rounded-3xl bg-card p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <p className="font-semibold">Ik zoek een buddy</p>
          <Switch checked={looking} onCheckedChange={(v) => save(interests, v)} />
        </div>
        <p className="text-sm font-semibold">
          Wat vind jij leuk?{" "}
          <span className="font-normal text-muted-foreground">(max. {MAX_INTERESTS})</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => {
            const on = interests.includes(i.id);
            return (
              <button
                key={i.id}
                onClick={() => save(toggleInterest(interests, i.id), looking)}
                className={`rounded-full px-3 py-1.5 text-sm ${on ? "bg-primary text-primary-foreground" : "bg-muted"}`}
              >
                {i.emoji} {i.label}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Andere leden zien alleen wat jullie allebei leuk vinden.
        </p>
      </section>

      {looking && (
        <section className="space-y-2">
          <h2 className="text-xl">Misschien een buddy voor jou</h2>
          {interests.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Kies eerst een paar dingen die je leuk vindt.
            </p>
          )}
          {interests.length > 0 && matches.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nog niemand gevonden. Kom later terug, er komen steeds meer leden bij!
            </p>
          )}
          {matches.map((m) => (
            <div
              key={m.user_id}
              className="flex items-center gap-3 rounded-3xl bg-card p-4 shadow-soft"
            >
              <UserAvatar path={m.avatar_url} name={m.display_name} userId={m.user_id} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{m.display_name}</p>
                <p className="text-xs text-muted-foreground">
                  {m.shared.length
                    ? `Jullie vinden allebei leuk: ${m.shared.map((s) => interestById(s)?.emoji ?? "").join(" ")}`
                    : "Zoekt ook een buddy"}
                </p>
              </div>
              {sent.has(m.user_id) ? (
                <span className="text-xs text-muted-foreground">Verstuurd ✓</span>
              ) : (
                <Button size="sm" className="rounded-full" onClick={() => ask(m.user_id)}>
                  Hoi! 👋
                </Button>
              )}
            </div>
          ))}
        </section>
      )}
      <button
        onClick={() => nav({ to: "/vrienden" })}
        className="block w-full text-center text-sm text-primary underline"
      >
        Of zoek zelf iemand bij Vrienden zoeken
      </button>
    </div>
  );
}
