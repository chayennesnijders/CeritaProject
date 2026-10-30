import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { eventStatus, eventTime } from "@/lib/events";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda — CeritaProject" },
      {
        name: "description",
        content: "Online meetups voor jouw leeftijd. Meld je aan en doe mee.",
      },
    ],
  }),
  component: AgendaPage,
});

/** Online meetups for your own age band: sign up, get a reminder, join with one tap. */
function AgendaPage() {
  const { data: me } = useMe();
  const uid = me?.user.id;
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["agenda", uid],
    enabled: !!uid,
    queryFn: async () => {
      const since = new Date(Date.now() - 4 * 3600_000).toISOString();
      const [e, r, c] = await Promise.all([
        supabase
          .from("events")
          .select("*")
          .gte("starts_at", since)
          .eq("age_group", me!.profile!.age_group)
          .order("starts_at"),
        supabase.from("event_rsvps").select("event_id").eq("user_id", uid!),
        supabase.rpc("event_counts"),
      ]);
      return {
        events: (e.data ?? []).filter((x) => eventStatus(x.starts_at, x.minutes) !== "voorbij"),
        going: new Set((r.data ?? []).map((x) => x.event_id)),
        counts: new Map((c.data ?? []).map((x) => [x.event_id, x.going])),
      };
    },
  });

  async function toggle(eventId: string, going: boolean) {
    if (!uid) return;
    const { error } = going
      ? await supabase.from("event_rsvps").delete().eq("event_id", eventId).eq("user_id", uid)
      : await supabase.from("event_rsvps").insert({ event_id: eventId, user_id: uid });
    if (error) toast.error("Dat lukte niet.");
    else toast.success(going ? "Afgemeld" : "Je bent aangemeld! Je krijgt een herinnering. 🎉");
    qc.invalidateQueries({ queryKey: ["agenda", uid] });
  }

  return (
    <div className="space-y-4 pt-2">
      <div>
        <h1 className="text-3xl">📅 Agenda</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Online meetups met leden van jouw leeftijd, begeleid door CeritaProject. Meld je aan, dan
          krijg je een herinnering.
        </p>
      </div>
      {data?.events.length === 0 && (
        <div className="rounded-3xl bg-card p-6 text-center shadow-soft">
          <p className="text-4xl">🗓️</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Er staan nog geen meetups gepland. Kijk binnenkort nog eens!
          </p>
        </div>
      )}
      {data?.events.map((e) => {
        const going = data.going.has(e.id);
        const status = eventStatus(e.starts_at, e.minutes);
        const n = data.counts.get(e.id) ?? 0;
        return (
          <article key={e.id} className="space-y-3 rounded-3xl bg-card p-4 shadow-soft">
            <div>
              {status === "bezig" && (
                <span className="mb-1 inline-block rounded-full bg-[#e53935] px-2 py-0.5 text-[11px] font-bold text-white">
                  ● Nu bezig
                </span>
              )}
              <p className="text-lg font-semibold">{e.title}</p>
              <p className="text-sm text-muted-foreground">
                🕒 {eventTime(e.starts_at)} · {e.minutes} min
              </p>
              <p className="text-xs text-muted-foreground">
                {n} {n === 1 ? "lid doet" : "leden doen"} mee
              </p>
            </div>
            {e.description && <p className="whitespace-pre-wrap text-sm">{e.description}</p>}
            <div className="flex gap-2">
              <Button
                variant={going ? "outline" : "default"}
                className="flex-1 rounded-full"
                onClick={() => toggle(e.id, going)}
              >
                {going ? "✓ Aangemeld (afmelden)" : "Ik doe mee!"}
              </Button>
              {going && e.link && status === "bezig" && (
                <Button asChild className="flex-1 rounded-full">
                  <a href={e.link} target="_blank" rel="noopener noreferrer">
                    🎥 Naar de meetup
                  </a>
                </Button>
              )}
            </div>
            {going && e.link && status === "straks" && (
              <p className="text-[11px] text-muted-foreground">
                De knop om mee te doen verschijnt hier als de meetup begint.
              </p>
            )}
          </article>
        );
      })}
      <p className="text-center text-[11px] text-muted-foreground">
        De huisregels gelden ook tijdens een meetup. Je hoeft je camera niet aan te zetten.
      </p>
    </div>
  );
}
