import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe, ageGroupFor } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { notifyChatRequest } from "@/lib/push.functions";
import { UserAvatar } from "@/components/UserAvatar";
import { useUnreadCounts } from "@/lib/unread";
import { listStamp } from "@/lib/chat-dates";

export const Route = createFileRoute("/_authenticated/berichten/")({
  head: () => ({ meta: [{ title: "Berichten — CeritaProject" }, { name: "description", content: "Je berichten en chatverzoeken op CeritaProject." }, { property: "og:title", content: "Berichten — CeritaProject" }, { property: "og:description", content: "Je berichten en chatverzoeken op CeritaProject." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: InboxPage,
});

function InboxPage() {
  const { data: me } = useMe();
  const unread = useUnreadCounts();
  const uid = me?.user.id;
  const nav = useNavigate();
  const qc = useQueryClient();
  const notify = useServerFn(notifyChatRequest);
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const band = me?.profile?.birthdate ? ageGroupFor(new Date(me.profile.birthdate)) : null;

  const { data } = useQuery({
    queryKey: ["inbox", uid],
    enabled: !!uid && band !== "no_community",
    queryFn: async () => {
      const [c, p, pr] = await Promise.all([
        supabase.from("conversations").select("*").order("last_message_at", { ascending: false }),
        supabase.from("profiles").select("id, display_name, username, allow_messages, avatar_url").neq("id", uid!).order("display_name"),
        supabase.from("conversation_prefs").select("conversation_id, muted, archived").eq("user_id", uid!),
      ]);
      const people = p.data ?? [];
      const names = Object.fromEntries(people.map((x) => [x.id, x.display_name]));
      const avatars = Object.fromEntries(people.map((x) => [x.id, x.avatar_url]));
      const prefs = Object.fromEntries((pr.data ?? []).map((x) => [x.conversation_id, x]));
      return { convs: c.data ?? [], people, names, avatars, prefs };
    },
  });

  if (band === "no_community")
    return (
      <div className="pt-2">
        <h1 className="text-3xl">Berichten</h1>
        <div className="mt-4 rounded-3xl bg-card p-5 text-sm shadow-soft">Privéberichten en groepen zijn voor leden tot en met 27 jaar. Je verhalen, je diertje en de rest van de app blijven gewoon beschikbaar.</div>
      </div>
    );
  if (!me?.profile?.birthdate) return <p className="pt-6 text-sm text-muted-foreground">Vul eerst je geboortedatum in op je profiel.</p>;

  async function start(other: string) {
    const [a, b] = [uid!, other].sort();
    const existing = data?.convs.find((c) => c.user_a === a && c.user_b === b);
    if (existing) {
      if (existing.status === "accepted") return nav({ to: "/berichten/$id", params: { id: existing.id } });
      return toast("Er loopt al een verzoek tussen jullie.");
    }
    const { data: created, error } = await supabase.from("conversations").insert({ user_a: a!, user_b: b!, requested_by: uid! }).select("id").single();
    if (error) { toast.error("Je kunt deze persoon (nu) geen bericht sturen."); return; }
    notify({ data: { convId: created.id } }).catch(() => {});
    toast.success("Verzoek verstuurd! Zodra de ander accepteert, kunnen jullie chatten.");
    qc.invalidateQueries({ queryKey: ["inbox", uid] });
  }

  async function respond(convId: string, accept: boolean) {
    const { error } = accept
      ? await supabase.from("conversations").update({ status: "accepted" }).eq("id", convId)
      : await supabase.from("conversations").delete().eq("id", convId);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["inbox", uid] });
  }

  async function reportRequest(requesterId: string, name: string) {
    const why = window.prompt(`Waarom meld je het verzoek van ${name}?`);
    if (!why?.trim()) return;
    const { error } = await supabase.from("reports").insert({ reporter_id: uid!, reason: `Chatverzoek van ${name}: ${why.trim().slice(0, 500)}` });
    toast[error ? "error" : "success"](error ? error.message : "Gemeld. Een beheerder kijkt ernaar.");
  }

  const needle = q.trim().toLowerCase().replace(/^@/, "");
  const matches = needle ? (data?.people ?? []).filter((p) => p.allow_messages && (p.display_name.toLowerCase().includes(needle) || (p.username ?? "").includes(needle))).slice(0, 8) : [];
  // Beheerders mogen alles *zien* (voor het overzicht in Beheer), maar de inbox
  // toont alleen je eigen gesprekken — anders lijkt een verzoek van anderen
  // "inkomend" terwijl alleen de ontvanger hem kan accepteren.
  const convs = (data?.convs ?? []).filter((c) => c.user_a === uid || c.user_b === uid);
  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const fresh = convs.filter((c) => c.status !== "pending" || new Date(c.created_at).getTime() > twoWeeksAgo);
  const incoming = fresh.filter((c) => c.status === "pending" && c.requested_by !== uid);
  const outgoing = fresh.filter((c) => c.status === "pending" && c.requested_by === uid);
  const accepted = fresh.filter((c) => c.status === "accepted");
  const active = accepted.filter((c) => !data?.prefs[c.id]?.archived);
  const archived = accepted.filter((c) => data?.prefs[c.id]?.archived);
  return (
    <div className="space-y-4 pt-2">
      <h1 className="text-3xl">Berichten</h1>
      {!me.profile.allow_messages && <p className="rounded-2xl bg-accent p-3 text-xs">Anderen kunnen jou nog geen bericht sturen. Zet "berichten toestaan" aan op je profiel.</p>}
      {incoming.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg">Verzoeken ({incoming.length})</h2>
          {incoming.map((c) => (
            <div key={c.id} className="rounded-3xl bg-card p-4 shadow-soft">
              <p className="text-sm"><b>{data!.names[c.requested_by] ?? "Iemand"}</b> wil met je chatten.</p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" className="rounded-full" onClick={() => respond(c.id, true)}>Accepteren</Button>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => respond(c.id, false)}>Afwijzen</Button>
                <Button size="sm" variant="ghost" className="rounded-full text-xs" onClick={() => reportRequest(c.requested_by, data!.names[c.requested_by] ?? "dit lid")}>Melden</Button>
              </div>
            </div>
          ))}
        </section>
      )}
      <Link to="/vrienden" className="flex items-center justify-between rounded-3xl bg-accent p-4 text-sm font-semibold shadow-soft">
        <span>💛 Vrienden zoeken</span>
        <span className="text-xs font-normal text-muted-foreground">vind leden van jouw leeftijd →</span>
      </Link>
      <Input placeholder="Zoek op naam of @gebruikersnaam…" value={q} onChange={(e) => setQ(e.target.value)} className="rounded-2xl" />
      {matches.map((p) => (
        <button key={p.id} onClick={() => start(p.id)} className="flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left text-sm shadow-soft">
          <UserAvatar path={p.avatar_url} name={p.display_name} userId={p.id} />
          <span>Stuur een chatverzoek aan <b>{p.display_name}</b>{p.username && <span className="text-muted-foreground"> @{p.username}</span>}</span>
        </button>
      ))}
      <div className="space-y-2">
        {active.map((c) => {
          const other = c.user_a === uid ? c.user_b : c.user_a;
          return (
            <Link key={c.id} to="/berichten/$id" params={{ id: c.id }} className="flex items-center gap-3 rounded-3xl bg-card p-4 shadow-soft">
              <UserAvatar path={data!.avatars[other]} name={data!.names[other] ?? "Lid"} userId={other} />
              <div>
                <p className="font-semibold">{data!.names[other] ?? "Lid"}{data!.prefs[c.id]?.muted && <span className="ml-1 text-xs">🔕</span>}</p>
                <p className="text-xs text-muted-foreground">{listStamp(c.last_message_at)}</p>
              </div>
              {unread.dm[c.id] ? (
                <span className="ml-auto flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-2 text-xs font-bold text-accent-foreground">{unread.dm[c.id]}</span>
              ) : null}
            </Link>
          );
        })}
        {archived.length > 0 && (
          <div>
            <button onClick={() => setShowArchived(!showArchived)} className="text-sm text-primary">Gearchiveerd ({archived.length}) {showArchived ? "▴" : "▾"}</button>
            {showArchived && archived.map((c) => {
              const other = c.user_a === uid ? c.user_b : c.user_a;
              return (
                <Link key={c.id} to="/berichten/$id" params={{ id: c.id }} className="mt-2 flex items-center gap-3 rounded-3xl bg-muted p-4">
                  <UserAvatar path={data!.avatars[other]} name={data!.names[other] ?? "Lid"} userId={other} />
                  <div>
                    <p className="font-semibold">{data!.names[other] ?? "Lid"}</p>
                    <p className="text-xs text-muted-foreground">{listStamp(c.last_message_at)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        {outgoing.map((c) => {
          const other = c.user_a === uid ? c.user_b : c.user_a;
          return (
            <div key={c.id} className="rounded-3xl bg-muted p-4">
              <p className="text-sm font-semibold">{data!.names[other] ?? "Lid"}</p>
              <p className="text-xs text-muted-foreground">Verzoek verstuurd — wachten op antwoord.</p>
            </div>
          );
        })}
        {fresh.length === 0 && <p className="text-sm text-muted-foreground">Nog geen gesprekken.</p>}
      </div>
    </div>
  );
}
