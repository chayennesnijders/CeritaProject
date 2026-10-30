import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { useServerFn } from "@tanstack/react-start";
import { notifyCompliment } from "@/lib/push.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/UserAvatar";
import { COMPLIMENTS, COMPLIMENT_IDS, wallColor } from "@/lib/compliments";
import { useMarkComplimentsSeen, useMyCompliments } from "@/lib/use-compliments";

export const Route = createFileRoute("/_authenticated/complimenten")({
  validateSearch: (s: Record<string, unknown>): { aan?: string } =>
    typeof s["aan"] === "string" ? { aan: s["aan"] } : {},
  head: () => ({
    meta: [
      { title: "Complimentenmuur — CeritaProject" },
      {
        name: "description",
        content: "Stuur een anoniem compliment en bekijk wat anderen over jou zeggen.",
      },
    ],
  }),
  component: ComplimentsPage,
});

/** Your wall of compliments (senders stay anonymous) and sending one yourself. */
function ComplimentsPage() {
  const { aan } = Route.useSearch();
  const { data: me } = useMe();
  const uid = me?.user.id;
  const qc = useQueryClient();
  const notify = useServerFn(notifyCompliment);
  const [tab, setTab] = useState<"muur" | "sturen">(aan ? "sturen" : "muur");
  const [to, setTo] = useState<string | null>(aan ?? null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: wall = [] } = useMyCompliments(uid);
  const seenBefore = useMarkComplimentsSeen(uid, tab === "muur");
  const band = me?.profile?.age_group;
  const { data: people = [] } = useQuery({
    queryKey: ["compliment-people", uid, band],
    enabled: !!uid && !!band && tab === "sturen",
    queryFn: async () => {
      const [p, b] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name, username, avatar_url, allow_messages")
          .neq("id", uid!)
          .eq("age_group", band!)
          .order("display_name"),
        supabase
          .from("blocks")
          .select("blocker_id, blocked_id")
          .or(`blocker_id.eq.${uid},blocked_id.eq.${uid}`),
      ]);
      const blocked = new Set(
        (b.data ?? []).map((x) => (x.blocker_id === uid ? x.blocked_id : x.blocker_id)),
      );
      return (p.data ?? []).filter((x) => x.allow_messages && !blocked.has(x.id));
    },
  });
  const person = people.find((p) => p.id === to);
  const shown = people
    .filter((p) =>
      `${p.display_name} ${p.username ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()),
    )
    .slice(0, 30);

  async function send(compliment: number) {
    if (!to) return;
    setBusy(true);
    const { error } = await supabase.rpc("send_compliment", { _to: to, _compliment: compliment });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Je compliment is verstuurd naar ${person?.display_name ?? "de ander"}! 💐`);
    notify({ data: { to } }).catch(() => {});
    setTo(null);
    qc.invalidateQueries({ queryKey: ["badge-stats"] });
  }

  return (
    <div className="space-y-4 pt-2">
      <div>
        <h1 className="text-2xl">💐 Complimentenmuur</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Maak iemands dag goed met een compliment. Je blijft anoniem: de ander ziet niet van wie
          het komt.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
        {(["muur", "sturen"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full py-2 text-sm font-semibold ${tab === t ? "bg-card shadow-soft" : ""}`}
          >
            {t === "muur" ? `Mijn muur (${wall.length})` : "Compliment sturen"}
          </button>
        ))}
      </div>

      {tab === "muur" ? (
        wall.length === 0 ? (
          <div className="rounded-3xl bg-card p-6 text-center shadow-soft">
            <p className="text-4xl">🌸</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Je muur is nog leeg. Stuur zelf eens een compliment: dat maakt iemand anders heel
              blij!
            </p>
          </div>
        ) : (
          <div className="columns-2 gap-2 space-y-2">
            {wall.map((c) => {
              const x = COMPLIMENTS[c.compliment];
              return (
                <div
                  key={c.id}
                  className="break-inside-avoid rounded-3xl p-4 text-center shadow-soft animate-in zoom-in-95"
                  style={{ background: wallColor(c.id), color: "#2a1a14" }}
                >
                  {seenBefore !== undefined && (!seenBefore || c.created_at > seenBefore) && (
                    <span className="mb-1 inline-block rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold">
                      ✨ Nieuw
                    </span>
                  )}
                  <p className="text-3xl">{x?.emoji}</p>
                  <p className="mt-1 text-sm font-semibold">{x?.text}</p>
                  <p className="mt-2 text-[10px] opacity-60">
                    {new Date(c.created_at).toLocaleDateString("nl-NL", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
              );
            })}
          </div>
        )
      ) : !to ? (
        <section className="space-y-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Zoek op naam…"
            className="h-12 rounded-2xl"
          />
          {shown.map((p) => (
            <button
              key={p.id}
              onClick={() => setTo(p.id)}
              className="flex w-full items-center gap-3 rounded-3xl bg-card p-3 text-left shadow-soft active:scale-[0.99]"
            >
              <UserAvatar path={p.avatar_url} name={p.display_name} userId={p.id} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{p.display_name}</span>
                {p.username && (
                  <span className="block text-xs text-muted-foreground">@{p.username}</span>
                )}
              </span>
              <span className="text-xl">💐</span>
            </button>
          ))}
          {shown.length === 0 && <p className="text-sm text-muted-foreground">Niemand gevonden.</p>}
        </section>
      ) : (
        <section className="space-y-3">
          <div className="flex items-center justify-between rounded-3xl bg-secondary p-3 text-secondary-foreground">
            <p className="text-sm font-semibold">Voor: {person?.display_name ?? "…"}</p>
            <button onClick={() => setTo(null)} className="text-xs underline">
              Iemand anders
            </button>
          </div>
          <p className="text-sm font-semibold">Kies een compliment:</p>
          <div className="grid grid-cols-2 gap-2">
            {COMPLIMENT_IDS.map((id) => (
              <Button
                key={id}
                variant="outline"
                disabled={busy}
                onClick={() => send(id)}
                className="h-auto whitespace-normal rounded-2xl p-3 text-left text-sm"
              >
                <span className="mr-1 text-xl">{COMPLIMENTS[id]!.emoji}</span>
                {COMPLIMENTS[id]!.text}
              </Button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
