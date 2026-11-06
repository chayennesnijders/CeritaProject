import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { BUDDY_LINKS, BUDDY_MODES } from "@/lib/ceritabuddy";

/** The Claude models admins can choose from (via the Anthropic key). */
const MODELS = [
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5 (aanrader: snel en goedkoop)" },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 (nog beter, ongeveer 20× duurder)" },
];

type Stats = { messages_today: number; people_today: number; people_7_days: number; messages_7_days: number };

/** Beheer → CeritaBuddy: settings and counts. Conversations themselves are never visible here. */
export function BuddyAdmin() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ["buddy-settings"],
    queryFn: async () => (await supabase.from("buddy_settings").select("*").eq("id", 1).maybeSingle()).data,
  });
  const { data: stats } = useQuery({
    queryKey: ["buddy-stats"],
    queryFn: async () => (await supabase.rpc("buddy_stats")).data as unknown as Stats | null,
  });
  const [form, setForm] = useState({ enabled: true, model: "claude-haiku-5-5", daily_limit: 40, context_messages: 16, max_reply_tokens: 700, extra_instructions: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (settings)
      setForm({
        enabled: settings.enabled,
        model: settings.model,
        daily_limit: settings.daily_limit,
        context_messages: settings.context_messages,
        max_reply_tokens: settings.max_reply_tokens,
        extra_instructions: settings.extra_instructions,
      });
  }, [settings]);

  async function save() {
    setBusy(true);
    const { data: who } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("buddy_settings")
      .update({ ...form, updated_at: new Date().toISOString(), updated_by: who.user?.id ?? null })
      .eq("id", 1)
      .select("id");
    setBusy(false);
    if (error || !data?.length) {
      toast.error(error?.message ?? "Opslaan lukte niet. Heb je update-47 al in Supabase gedraaid?");
      return;
    }
    toast.success("Opgeslagen. Het volgende bericht gebruikt de nieuwe instellingen.");
    qc.invalidateQueries({ queryKey: ["buddy-settings"] });
  }

  const num = (k: "daily_limit" | "context_messages" | "max_reply_tokens", min: number, max: number) => (
    <input
      id={`buddy-${k}`}
      type="number"
      min={min}
      max={max}
      value={form[k]}
      onChange={(e) => setForm({ ...form, [k]: Math.min(max, Math.max(min, Number(e.target.value) || min)) })}
      className="h-9 w-24 rounded-xl border border-input bg-background px-2 text-sm"
    />
  );

  if (settings === null)
    return (
      <p className="rounded-3xl bg-card p-4 text-sm shadow-soft">
        CeritaBuddy is nog niet geïnstalleerd. Plak <b>supabase/update-47-ceritabuddy.sql</b> in Supabase → SQL Editor en klik Run.
      </p>
    );

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-2">
        {[
          ["Berichten vandaag", stats?.messages_today],
          ["Jongeren vandaag", stats?.people_today],
          ["Berichten 7 dagen", stats?.messages_7_days],
          ["Jongeren 7 dagen", stats?.people_7_days],
        ].map(([label, n]) => (
          <div key={label as string} className="rounded-2xl bg-card p-3 shadow-soft">
            <p className="font-display text-2xl tabular-nums">{n ?? "–"}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </section>
      <p className="rounded-2xl bg-secondary p-3 text-xs text-secondary-foreground">
        🔒 Gesprekken zelf zijn alleen zichtbaar voor de jongere. Ook beheerders kunnen ze niet lezen; je ziet hier alleen aantallen.
      </p>

      <section className="space-y-3 rounded-3xl bg-card p-4 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">CeritaBuddy aan</p>
            <p className="text-xs text-muted-foreground">Uit = jongeren zien een melding dat de buddy even uit staat.</p>
          </div>
          <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
        </div>
        <label className="block text-sm font-semibold" htmlFor="buddy-model">AI-model</label>
        <select
          id="buddy-model"
          value={form.model}
          onChange={(e) => setForm({ ...form, model: e.target.value })}
          className="h-10 w-full rounded-xl border border-input bg-background px-2 text-sm"
        >
          {MODELS.some((m) => m.id === form.model) ? null : <option value={form.model}>{form.model}</option>}
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-2"><span>Berichten per jongere per dag</span>{num("daily_limit", 0, 1000)}</div>
          <div className="flex items-center justify-between gap-2"><span>Hoeveel eerdere berichten de AI meekrijgt</span>{num("context_messages", 2, 60)}</div>
          <div className="flex items-center justify-between gap-2"><span>Maximale lengte antwoord (tokens)</span>{num("max_reply_tokens", 100, 4000)}</div>
        </div>
        <p className="text-xs text-muted-foreground">
          Kosten: met Claude Haiku 5.5 kost een bericht ongeveer €0,0006 (inclusief de veiligheidscheck). Bij 30 berichten per dag is dat hooguit zo'n 2 cent per jongere per dag. Zet ook een maandlimiet op platform.claude.com.
        </p>
      </section>

      <section className="space-y-2 rounded-3xl bg-card p-4 shadow-soft">
        <label className="block font-semibold" htmlFor="buddy-extra">Extra instructies en persoonlijkheid</label>
        <p className="text-xs text-muted-foreground">
          Komt bovenop de vaste instructie. Bijvoorbeeld: "Noem Riti af en toe" of "Verwijs bij examenstress naar de meetup op donderdag". De veiligheidsregels gaan altijd voor en kun je hier niet uitzetten.
        </p>
        <textarea
          id="buddy-extra"
          rows={6}
          maxLength={8000}
          value={form.extra_instructions}
          onChange={(e) => setForm({ ...form, extra_instructions: e.target.value })}
          className="w-full rounded-2xl border border-input bg-background p-3 text-sm"
        />
      </section>

      <Button className="w-full rounded-full" disabled={busy} onClick={save}>
        {busy ? "Opslaan…" : "Instellingen opslaan"}
      </Button>

      <details className="rounded-3xl bg-card p-4 text-sm shadow-soft">
        <summary className="cursor-pointer font-semibold">Wat kan CeritaBuddy al?</summary>
        <div className="mt-2 space-y-2">
          <p className="font-semibold">Gespreksstarters</p>
          <ul className="list-inside list-disc text-muted-foreground">
            {BUDDY_MODES.map((m) => <li key={m.id}>{m.emoji} {m.label}</li>)}
          </ul>
          <p className="font-semibold">Knoppen naar de app</p>
          <ul className="list-inside list-disc text-muted-foreground">
            {Object.values(BUDDY_LINKS).map((l) => <li key={l.to}>{l.emoji} {l.label}</li>)}
          </ul>
          <p className="font-semibold">Veiligheid</p>
          <p className="text-muted-foreground">
            Elk bericht gaat eerst langs een veiligheidscheck (woordpatronen én een aparte korte check door Claude), en de AI markeert zelf ook zorgelijke berichten. Dan ziet de jongere hulplijnen (113, Kindertelefoon, Veilig Thuis, en 112 bij acuut gevaar). Beheerders krijgen hiervan geen melding en kunnen niet meelezen.
          </p>
        </div>
      </details>
    </div>
  );
}
