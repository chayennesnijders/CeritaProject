import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe, bandLabel } from "@/lib/auth";
import { eventTime } from "@/lib/events";
import { toLocalInput } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Band = "junior" | "senior" | "adult";
const BANDS: Band[] = ["junior", "senior", "adult"];
const DURATIONS = [30, 45, 60, 90, 120];

/** Beheer → Agenda: plan online meetups for one age band, see how many signed up. */
export function EventsAdmin() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const empty = {
    title: "",
    description: "",
    starts: "",
    minutes: 60,
    link: "",
    band: (me?.profile?.age_group ?? "senior") as Band,
  };
  const [f, setF] = useState(empty);
  const [pending, setPending] = useState<{ id: string; title: string } | null>(null);
  const { data } = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const [e, c] = await Promise.all([
        supabase
          .from("events")
          .select("*")
          .gte("starts_at", new Date(Date.now() - 86_400_000).toISOString())
          .order("starts_at"),
        supabase.rpc("event_counts"),
      ]);
      return {
        events: e.data ?? [],
        counts: new Map((c.data ?? []).map((x) => [x.event_id, x.going])),
      };
    },
  });

  async function save() {
    if (!f.starts) {
      toast.error("Kies een datum en tijd.");
      return;
    }
    const link = f.link.trim();
    if (link && !/^https:\/\/\S+$/.test(link)) {
      toast.error("De link moet met https:// beginnen.");
      return;
    }
    const { error } = await supabase.from("events").insert({
      title: f.title.trim(),
      description: f.description.trim() || null,
      starts_at: new Date(f.starts).toISOString(),
      minutes: f.minutes,
      link: link || null,
      age_group: f.band,
      created_by: me?.user.id ?? null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Meetup gepland 📅");
    setF(empty);
    qc.invalidateQueries({ queryKey: ["admin-events"] });
  }
  async function remove() {
    if (!pending) return;
    const { data: gone, error } = await supabase
      .from("events")
      .delete()
      .eq("id", pending.id)
      .select("id");
    setPending(null);
    if (error || !gone?.length) {
      toast.error(error?.message ?? "Weghalen lukte niet.");
      return;
    }
    toast.success("Meetup weggehaald");
    qc.invalidateQueries({ queryKey: ["admin-events"] });
  }

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
        <h2 className="text-lg">📅 Meetup plannen</h2>
        <Input
          value={f.title}
          maxLength={80}
          onChange={(e) => setF({ ...f, title: e.target.value })}
          placeholder="Titel, bijv. Samen kletsen over examenstress"
          className="rounded-2xl"
        />
        <Textarea
          value={f.description}
          maxLength={1000}
          onChange={(e) => setF({ ...f, description: e.target.value })}
          placeholder="Wat gaan jullie doen? (mag leeg)"
          className="rounded-2xl"
        />
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">🗓️ Wanneer?</span>
          {/* Full width with its own label: on iPhone this field has no placeholder and is wider than it looks. */}
          <Input
            type="datetime-local"
            value={f.starts}
            min={toLocalInput(new Date().toISOString())}
            onChange={(e) => setF({ ...f, starts: e.target.value })}
            className="block h-12 w-full min-w-0 appearance-none rounded-2xl"
          />
        </label>
        <div className="space-y-1.5">
          <p className="text-sm font-semibold">⏱️ Hoe lang?</p>
          <div className="grid grid-cols-5 gap-1.5">
            {DURATIONS.map((m) => (
              <Button
                key={m}
                type="button"
                size="sm"
                variant={f.minutes === m ? "default" : "outline"}
                className="rounded-full px-0"
                onClick={() => setF({ ...f, minutes: m })}
              >
                {m < 60 ? `${m} min` : `${String(m / 60).replace(".", ",")} uur`}
              </Button>
            ))}
          </div>
        </div>
        <Input
          value={f.link}
          onChange={(e) => setF({ ...f, link: e.target.value })}
          placeholder="Link naar het videogesprek (Jitsi, Teams, Zoom, Meet)"
          className="rounded-2xl"
          inputMode="url"
        />
        <div className="flex flex-wrap gap-2">
          {BANDS.map((b) => (
            <Button
              key={b}
              size="sm"
              variant={f.band === b ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setF({ ...f, band: b })}
            >
              {bandLabel(b)}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Een meetup is altijd voor één leeftijdsgroep. Leden die meedoen krijgen een uur van
          tevoren een herinnering.
        </p>
        <Button
          disabled={f.title.trim().length < 3 || !f.starts}
          className="w-full rounded-full"
          onClick={save}
        >
          Plannen
        </Button>
      </section>
      <section className="space-y-2">
        {data?.events.length === 0 && (
          <p className="text-sm text-muted-foreground">Nog geen meetups gepland.</p>
        )}
        {data?.events.map((e) => (
          <div
            key={e.id}
            className="flex items-center gap-2 rounded-2xl bg-card p-3 text-sm shadow-soft"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{e.title}</span>
              <span className="block text-xs text-muted-foreground">
                {eventTime(e.starts_at)} · {bandLabel(e.age_group)} · {data.counts.get(e.id) ?? 0}{" "}
                aangemeld
              </span>
            </span>
            <button
              className="text-xs text-destructive underline"
              onClick={() => setPending({ id: e.id, title: e.title })}
            >
              Weg
            </button>
          </div>
        ))}
      </section>
      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>"{pending?.title}" weghalen?</AlertDialogTitle>
            <AlertDialogDescription>
              Leden die zich hebben aangemeld zien de meetup dan niet meer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Nee</AlertDialogCancel>
            <Button className="rounded-full" onClick={remove}>
              Ja, weghalen
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
