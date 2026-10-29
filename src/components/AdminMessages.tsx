import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { bandLabel } from "@/lib/auth";
import { MESSAGE_STATUS, topicInfo } from "@/lib/admin-messages";
import { answerAdminMessage } from "@/lib/push.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const FILTERS = [
  { id: "open", label: "Te doen" },
  { id: "beantwoord", label: "Beantwoord" },
  { id: "alles", label: "Alles" },
] as const;

/** Dashboard of messages members sent to the admins, with answering in place. */
export function AdminMessages() {
  const qc = useQueryClient();
  const answer = useServerFn(answerAdminMessage);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("open");
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["admin-messages"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("admin_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      const ids = [...new Set((rows ?? []).map((r) => r.user_id))];
      const { data: people } = ids.length
        ? await supabase
            .from("profiles")
            .select("id, display_name, username, age_group")
            .in("id", ids)
        : { data: [] };
      return { rows: rows ?? [], people: Object.fromEntries((people ?? []).map((p) => [p.id, p])) };
    },
  });
  const rows = data?.rows ?? [];
  const counts = {
    nieuw: rows.filter((r) => r.status === "nieuw").length,
    gelezen: rows.filter((r) => r.status === "gelezen").length,
    beantwoord: rows.filter((r) => r.status === "beantwoord").length,
  };
  const shown = rows.filter((r) =>
    filter === "alles"
      ? true
      : filter === "beantwoord"
        ? r.status === "beantwoord"
        : r.status !== "beantwoord",
  );

  async function act(id: string, reply?: string) {
    setBusy(id);
    try {
      await answer({ data: { id, reply } });
      toast.success(reply ? "Antwoord verstuurd 💌" : "Gemarkeerd als gelezen");
      if (reply) setDraft((d) => ({ ...d, [id]: "" }));
      qc.invalidateQueries({ queryKey: ["admin-messages"] });
      qc.invalidateQueries({ queryKey: ["admin-news"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Dat lukte niet.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ["nieuw", "📬", "Nieuw"],
            ["gelezen", "👀", "Gelezen"],
            ["beantwoord", "✅", "Beantwoord"],
          ] as const
        ).map(([k, emoji, label]) => (
          <div key={k} className="rounded-3xl bg-card p-3 text-center shadow-soft">
            <p className="text-xl">{emoji}</p>
            <p className="font-display text-2xl leading-none">{counts[k]}</p>
            <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant={filter === f.id ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            {f.id === "open" &&
              counts.nieuw + counts.gelezen > 0 &&
              ` · ${counts.nieuw + counts.gelezen}`}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {shown.length === 0 && (
          <p className="rounded-3xl bg-card p-5 text-center text-sm text-muted-foreground shadow-soft">
            {filter === "open" ? "Alles is beantwoord! 🎉" : "Nog geen berichten."}
          </p>
        )}
        {shown.map((m) => {
          const who = data?.people[m.user_id];
          const t = topicInfo(m.topic);
          const st = MESSAGE_STATUS[m.status] ?? MESSAGE_STATUS["nieuw"]!;
          const isOpen = open === m.id;
          return (
            <div key={m.id} className="rounded-3xl bg-card p-4 shadow-soft">
              <button className="w-full text-left" onClick={() => setOpen(isOpen ? null : m.id)}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {t.emoji} {t.label} ·{" "}
                    {new Date(m.created_at).toLocaleString("nl-NL", {
                      timeZone: "Europe/Amsterdam",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${st.cls}`}
                  >
                    {st.label}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold">
                  {who?.display_name ?? "Lid"}
                  {who?.username && (
                    <span className="font-normal text-muted-foreground"> @{who.username}</span>
                  )}
                  {who?.age_group && (
                    <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px] font-semibold">
                      {bandLabel(who.age_group)}
                    </span>
                  )}
                </p>
                <p className={`mt-1 whitespace-pre-wrap text-sm ${isOpen ? "" : "line-clamp-2"}`}>
                  {m.body}
                </p>
              </button>
              {isOpen && (
                <div className="mt-3 space-y-2">
                  {m.reply && (
                    <div className="rounded-2xl bg-secondary p-3 text-sm text-secondary-foreground">
                      <p className="text-xs font-semibold">Jouw antwoord</p>
                      <p className="mt-1 whitespace-pre-wrap">{m.reply}</p>
                    </div>
                  )}
                  <Textarea
                    value={draft[m.id] ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, [m.id]: e.target.value }))}
                    maxLength={2000}
                    rows={3}
                    placeholder={
                      m.reply
                        ? "Nog iets toevoegen? Dit vervangt je vorige antwoord."
                        : "Schrijf een antwoord…"
                    }
                    className="rounded-2xl"
                  />
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 rounded-full"
                      disabled={busy === m.id || !(draft[m.id] ?? "").trim()}
                      onClick={() => act(m.id, (draft[m.id] ?? "").trim())}
                    >
                      Antwoord sturen
                    </Button>
                    {m.status === "nieuw" && (
                      <Button
                        variant="outline"
                        className="rounded-full"
                        disabled={busy === m.id}
                        onClick={() => act(m.id)}
                      >
                        Gelezen
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Alleen dit lid ziet je antwoord, en krijgt er een melding van.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
