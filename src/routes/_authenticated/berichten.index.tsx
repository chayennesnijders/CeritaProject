import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useReportReason } from "@/components/ReportReasonDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
import { messagePreview, type LastMessage } from "@/lib/inbox-preview";

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
  const { ask: askReason, dialog: reportDialog } = useReportReason();
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const band = me?.profile?.birthdate ? ageGroupFor(new Date(me.profile.birthdate)) : null;

  const { data } = useQuery({
    queryKey: ["inbox", uid],
    enabled: !!uid && (band !== "no_community" || !!me?.isCoach),
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
      // The newest message of each of my open chats, for a one-line preview.
      const mineOpen = (c.data ?? []).filter((x) => x.status === "accepted" && (x.user_a === uid || x.user_b === uid)).slice(0, 20);
      const lasts = await Promise.all(
        mineOpen.map((x) =>
          supabase
            .from("direct_messages")
            .select("sender_id, body, sticker, audio_path, attachment_path, attachment_type, game_id")
            .eq("conversation_id", x.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
            .then((r) => [x.id, r.data] as const),
        ),
      );
      const last: Record<string, LastMessage | null> = Object.fromEntries(lasts);
      return { convs: c.data ?? [], people, names, avatars, prefs, last };
    },
  });

  // A new unread message means the previews are out of date.
  const unreadKey = JSON.stringify(unread.dm);
  useEffect(() => {
    if (uid) qc.invalidateQueries({ queryKey: ["inbox", uid] });
  }, [unreadKey, uid, qc]);

  if (band === "no_community" && !me?.isCoach)
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
    const why = await askReason(`Verzoek van ${name} melden`);
    if (!why?.trim()) return;
    const { error } = await supabase.from("reports").insert({ reporter_id: uid!, reason: `Chatverzoek van ${name}: ${why.trim().slice(0, 500)}` });
    toast[error ? "error" : "success"](error ? error.message : "Gemeld. Een beheerder kijkt ernaar.");
  }

  const needle = q.trim().toLowerCase().replace(/^@/, "");
  // Only by @username (no browsing through everyone): look for a buddy on the Buddy page.
  const matches = needle.length >= 2 ? (data?.people ?? []).filter((p) => p.allow_messages && (p.username ?? "").startsWith(needle)).slice(0, 8) : [];
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
      <Link to="/buddy" className="flex items-center justify-between rounded-3xl bg-accent p-4 text-sm font-semibold shadow-soft">
        <span>🤝 Buddy zoeken</span>
        <span className="text-xs font-normal text-muted-foreground">iemand die hetzelfde leuk vindt →</span>
      </Link>
      <Input placeholder="Ken je iemand? Zoek op @gebruikersnaam…" value={q} onChange={(e) => setQ(e.target.value)} className="rounded-2xl" />
      {matches.map((p) => (
        <button key={p.id} onClick={() => start(p.id)} className="flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left text-sm shadow-soft">
          <UserAvatar path={p.avatar_url} name={p.display_name} userId={p.id} />
          <span>Stuur een chatverzoek aan <b>{p.display_name}</b>{p.username && <span className="text-muted-foreground"> @{p.username}</span>}</span>
        </button>
      ))}
      <div className="space-y-2">
        {active.map((c) => {
          const other = c.user_a === uid ? c.user_b : c.user_a;
          const n = unread.dm[c.id] ?? 0;
          return (
            <Link key={c.id} to="/berichten/$id" params={{ id: c.id }}
              className={`flex items-center gap-3 rounded-3xl p-4 shadow-soft transition-transform active:scale-[0.98] ${n ? "bg-card ring-2 ring-primary/60" : "bg-card"}`}>
              <UserAvatar path={data!.avatars[other]} name={data!.names[other] ?? "Lid"} userId={other} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className="truncate font-semibold">{data!.names[other] ?? "Lid"}{data!.prefs[c.id]?.muted && <span className="ml-1 text-xs">🔕</span>}</p>
                  <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{listStamp(c.last_message_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <p className={`truncate text-sm ${n ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{messagePreview(data!.last[c.id], uid!)}</p>
                  {n ? (
                    <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">{n}</span>
                  ) : null}
                </div>
              </div>
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
        {data && fresh.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-3xl bg-card p-6 text-center shadow-soft">
            <img src="/riti/blij.webp" alt="" className="size-24 object-contain" />
            <p className="font-semibold">Nog geen gesprekken</p>
            <p className="text-sm text-muted-foreground">Zoek iemand die hetzelfde leuk vindt als jij, of zeg hoi in een groep.</p>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <Link to="/buddy" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">🤝 Buddy zoeken</Link>
              <Link to="/community" className="rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground">💬 Naar de groepen</Link>
            </div>
          </div>
        )}
      </div>
      {reportDialog}
    </div>
  );
}
