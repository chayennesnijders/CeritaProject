import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe, bandLabel } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AiReportHelper } from "@/components/AiReportHelper";
import { AnnouncementSender } from "@/components/AnnouncementSender";
import { ArticleComposer } from "@/components/ArticleComposer";
import { ShopOrdersAdmin } from "@/components/ShopOrdersAdmin";
import { StorySubmissionsAdmin } from "@/components/StorySubmissionsAdmin";
import { AdminNews } from "@/components/AdminNews";
import { ImpactReport } from "@/components/ImpactReport";
import { SafetyAlerts } from "@/components/SafetyAlerts";
import { MediaAdmin } from "@/components/MediaAdmin";
import { AdminMessages } from "@/components/AdminMessages";
import { PublicMessagesAdmin } from "@/components/PublicMessagesAdmin";
import { useAdminNews } from "@/lib/use-admin-news";
import { AdminWeekly } from "@/components/AdminWeekly";
import { ReportInbox } from "@/components/ReportInbox";
import { reportsQueryOptions } from "@/lib/reports";

const TABS = [
  { id: "nieuws", label: "Nieuws" },
  { id: "berichten", label: "Berichten" },
  { id: "impact", label: "Impact" },
  { id: "overzicht", label: "Overzicht" },
  { id: "inbox", label: "Inbox" },
  { id: "verhalen", label: "Verhalen" },
  { id: "luisteren", label: "Podcasts" },
  { id: "groepen", label: "Groepen" },
  { id: "logboek", label: "Logboek" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export function AdminPanel() {
  const { data: me } = useMe();
  const { data: openReportRows } = useQuery(reportsQueryOptions(me?.isAdmin ? me.user.id : undefined));
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("nieuws");
  const news = useAdminNews(me?.isAdmin ? me.user.id : undefined);
  const [qDate, setQDate] = useState(new Date().toISOString().slice(0, 10));
  const [qTitle, setQTitle] = useState("");
  const [qDesc, setQDesc] = useState("");
  const [gName, setGName] = useState("");
  const [gDesc, setGDesc] = useState("");
  const [gAge, setGAge] = useState<"junior" | "senior" | "adult">("senior");
  const [memberQuery, setMemberQuery] = useState("");
  const [warnTarget, setWarnTarget] = useState<string | null>(null);
  const [warnText, setWarnText] = useState("");

  const { data } = useQuery({
    queryKey: ["admin"],
    enabled: !!me?.isAdmin,
    queryFn: async () => {
      const [r, g, l, c, w, t, p] = await Promise.all([
        supabase.from("reports").select("*, post:posts(id, body, is_hidden, author_id), message:direct_messages(id, body, sender_id)").eq("status", "open").order("created_at", { ascending: false }),
        supabase.from("groups").select("*").order("age_group"),
        supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("conversations").select("*").order("last_message_at", { ascending: false }),
        supabase.from("member_warnings").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("member_timeouts").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("profiles").select("id, display_name, username, age_group").order("display_name"),
      ]);
      const reports = r.data ?? [];
      const log = l.data ?? [];
      const convs = c.data ?? [];
      const warnings = w.data ?? [];
      const timeouts = t.data ?? [];
      const members = p.data ?? [];
      const ids = [...new Set([
        ...log.map((x) => x.actor_id),
        ...reports.map((x) => x.reporter_id),
        ...reports.map((x) => x.message?.sender_id),
        ...convs.flatMap((x) => [x.user_a, x.user_b]),
        ...warnings.flatMap((x) => [x.member_id, x.admin_id]),
        ...timeouts.flatMap((x) => [x.member_id, x.admin_id]),
      ].filter(Boolean))] as string[];
      const { data: people } = ids.length ? await supabase.from("profiles").select("id, display_name").in("id", ids) : { data: [] };
      const names = Object.fromEntries((people ?? []).map((p) => [p.id, p.display_name]));
      return { reports, groups: g.data ?? [], log, convs, warnings, timeouts, members, names };
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });

  if (!me?.isAdmin) return <p className="pt-6 text-sm text-muted-foreground">Alleen voor beheerders.</p>;

  async function saveChallenge() {
    const { error } = await supabase.from("daily_challenges").upsert({ challenge_date: qDate, title: qTitle, description: qDesc || null }, { onConflict: "challenge_date" });
    toast[error ? "error" : "success"](error ? error.message : "Opdracht opgeslagen");
    if (!error) { setQTitle(""); setQDesc(""); refresh(); }
  }
  async function addGroup() {
    const { error } = await supabase.from("groups").insert({ name: gName, description: gDesc, age_group: gAge });
    if (error) { toast.error(error.message); return; }
    setGName(""); setGDesc(""); refresh();
  }
  async function warnMember(memberId: string, message?: string) {
    if (!me?.isAdmin) return;
    const text = (message ?? warnText).trim();
    if (!text) { toast.error("Schrijf eerst een waarschuwing"); return; }
    const { error } = await supabase.from("member_warnings").insert({ member_id: memberId, admin_id: me.user.id, message: text });
    toast[error ? "error" : "success"](error ? error.message : "Waarschuwing verstuurd");
    if (!error) { setWarnText(""); setWarnTarget(null); refresh(); }
  }
  async function timeoutMember(memberId: string, hours: number) {
    if (!me?.isAdmin) return;
    const label = hours < 24 ? `${hours} uur` : `${hours / 24} dagen`;
    const until = new Date(Date.now() + hours * 3600_000).toISOString();
    const { error } = await supabase.from("member_timeouts").insert({ member_id: memberId, admin_id: me.user.id, until });
    toast[error ? "error" : "success"](error ? error.message : `Time-out van ${label} ingesteld`);
    if (!error) { setWarnTarget(null); refresh(); }
  }
  async function endTimeout(timeoutId: string) {
    const { error } = await supabase.from("member_timeouts").delete().eq("id", timeoutId);
    toast[error ? "error" : "success"](error ? error.message : "Time-out beëindigd");
    if (!error) refresh();
  }

  const openReports = openReportRows?.length ?? 0;

  return (
    <div className="space-y-4 pt-2">
      <h1 className="text-3xl">Beheer</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <Button key={t.id} size="sm" variant={tab === t.id ? "default" : "outline"} className="shrink-0 rounded-full" onClick={() => setTab(t.id)}>
            {t.label}
            {t.id === "nieuws" && news.unread > 0 && <span className="ml-1 rounded-full bg-primary-foreground/20 px-1.5 text-xs">{news.unread}</span>}
            {t.id === "inbox" && openReports > 0 && <span className="ml-1 rounded-full bg-primary-foreground/20 px-1.5 text-xs">{openReports}</span>}
          </Button>
        ))}
      </div>

      {tab === "nieuws" && <AdminNews uid={me.user.id} onOpenTab={(t) => setTab(t as Tab)} />}

      {tab === "berichten" && (
        <div className="space-y-6">
          <AdminMessages />
          <PublicMessagesAdmin />
        </div>
      )}

      {tab === "impact" && <ImpactReport />}

      {tab === "luisteren" && <MediaAdmin />}

      {tab === "overzicht" && (
        <div className="space-y-5">
          <AdminWeekly />
          {me.isOwner && <ShopOrdersAdmin />}
          <AnnouncementSender />
        </div>
      )}

      {tab === "inbox" && (
        <div className="space-y-5">
          <SafetyAlerts />
          <ReportInbox onWarn={(id) => { setWarnTarget(id); setWarnText(""); }} onTimeout={timeoutMember} />
          <section className="rounded-3xl bg-card p-5 shadow-soft">
            <h2 className="text-lg">Lid waarschuwen of time-out geven</h2>
            <p className="mt-1 text-xs text-muted-foreground">Zoek een lid op naam of @gebruikersnaam. Een waarschuwing verschijnt als kaartje op de homepagina van het lid; bij een time-out kan het lid niet in groepen posten.</p>
            <Input placeholder="Zoek een lid…" value={memberQuery} onChange={(e) => setMemberQuery(e.target.value)} className="mt-3 rounded-2xl" />
            {memberQuery.trim() && (
              <div className="mt-2 space-y-1">
                {data?.members
                  .filter((m) => (m.display_name + " " + (m.username ?? "")).toLowerCase().includes(memberQuery.trim().toLowerCase()))
                  .slice(0, 5)
                  .map((m) => (
                    <button key={m.id} onClick={() => { setWarnTarget(m.id); setMemberQuery(""); }} className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm ${warnTarget === m.id ? "bg-primary/20" : "bg-muted"}`}>
                      <span className="font-semibold">{m.display_name}</span>
                      <span className="text-xs text-muted-foreground">{m.username ? `@${m.username} · ` : ""}{bandLabel(m.age_group)}</span>
                    </button>
                  ))}
              </div>
            )}
            {warnTarget && (
              <div className="mt-3 space-y-2 rounded-2xl border-2 border-ink bg-muted p-3">
                <p className="text-sm font-semibold">Gekozen lid: {data?.names[warnTarget] ?? data?.members.find((m) => m.id === warnTarget)?.display_name ?? "lid"}</p>
                <textarea placeholder="Schrijf hier de waarschuwing…" value={warnText} onChange={(e) => setWarnText(e.target.value)} rows={3} className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm" />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="rounded-full" disabled={!warnText.trim()} onClick={() => { if (warnTarget) warnMember(warnTarget); }}>⚠️ Waarschuwing sturen</Button>
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => timeoutMember(warnTarget, 24)}>Time-out 1 dag</Button>
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => timeoutMember(warnTarget, 24 * 7)}>Time-out 7 dagen</Button>
                  <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setWarnTarget(null)}>Annuleren</Button>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-card p-5 shadow-soft">
            <h2 className="text-lg">Verstuurde waarschuwingen ({data?.warnings.length ?? 0})</h2>
            <div className="mt-3 space-y-3">
              {data?.warnings.map((w) => (
                <div key={w.id} className="rounded-2xl bg-muted p-3 text-sm">
                  <p><span className="font-semibold">{(w.admin_id && data.names[w.admin_id]) || "Beheerder"}</span> waarschuwde <span className="font-semibold">{data.names[w.member_id] ?? "een lid"}</span></p>
                  <p className="mt-1">“{w.message}”</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(w.created_at).toLocaleString("nl-NL")}</p>
                </div>
              ))}
              {data?.warnings.length === 0 && <p className="text-sm text-muted-foreground">Nog geen waarschuwingen verstuurd.</p>}
            </div>
          </section>

          <section className="rounded-3xl bg-card p-5 shadow-soft">
            <h2 className="text-lg">Time-outs ({data?.timeouts.length ?? 0})</h2>
            <div className="mt-3 space-y-3">
              {data?.timeouts.map((t) => {
                const active = new Date(t.until) > new Date();
                return (
                  <div key={t.id} className="rounded-2xl bg-muted p-3 text-sm">
                    <p><span className="font-semibold">{data.names[t.member_id] ?? "Een lid"}</span> {active ? `heeft een time-out tot ${new Date(t.until).toLocaleString("nl-NL")}` : `had een time-out tot ${new Date(t.until).toLocaleString("nl-NL")}`}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Gegeven door {(t.admin_id && data.names[t.admin_id]) || "beheerder"} op {new Date(t.created_at).toLocaleString("nl-NL")}{t.reason ? ` · Reden: ${t.reason}` : ""}</p>
                    {active && <Button size="sm" variant="outline" className="mt-2 rounded-full" onClick={() => endTimeout(t.id)}>Time-out beëindigen</Button>}
                  </div>
                );
              })}
              {data?.timeouts.length === 0 && <p className="text-sm text-muted-foreground">Nog geen time-outs gegeven.</p>}
            </div>
          </section>

          <AiReportHelper />
          <section className="rounded-3xl bg-card p-5 shadow-soft">
            <h2 className="text-lg">Chat-overzicht ({data?.convs.length ?? 0})</h2>
            <p className="mt-1 text-xs text-muted-foreground">Wie met wie chatted en wanneer. De berichten zelf blijven privé.</p>
            <div className="mt-3 space-y-3">
              {data?.convs.map((c) => (
                <div key={c.id} className="rounded-2xl bg-muted p-3 text-sm">
                  <p className="font-semibold">{data.names[c.user_a] ?? "Onbekend lid"} ↔ {data.names[c.user_b] ?? "Onbekend lid"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.status === "accepted" ? "Actief gesprek" : "Verzoek in afwachting"} · gestart {new Date(c.created_at).toLocaleString("nl-NL")} · laatste bericht {new Date(c.last_message_at).toLocaleString("nl-NL")}
                  </p>
                </div>
              ))}
              {data?.convs.length === 0 && <p className="text-sm text-muted-foreground">Nog geen gesprekken.</p>}
            </div>
          </section>
        </div>
      )}

      {tab === "verhalen" && (
        <div className="space-y-5">
          <ArticleComposer />
          <StorySubmissionsAdmin />
        </div>
      )}


      {tab === "groepen" && (
        <div className="space-y-5">
          <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
            <h2 className="text-lg">Opdracht van de dag</h2>
            <p className="text-xs text-muted-foreground">Leden zien deze opdracht op Home en bewaren hun tekst of foto in hun privé-dagboek.</p>
            <Input type="date" value={qDate} onChange={(e) => setQDate(e.target.value)} className="rounded-2xl" />
            <Input placeholder="Opdracht, bijv. Maak een foto van iets dat je blij maakt" value={qTitle} onChange={(e) => setQTitle(e.target.value)} className="rounded-2xl" />
            <Input placeholder="Toelichting (optioneel)" value={qDesc} onChange={(e) => setQDesc(e.target.value)} className="rounded-2xl" />
            <Button disabled={!qTitle} onClick={saveChallenge} className="w-full rounded-full">Opslaan</Button>
          </section>
          <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
            <h2 className="text-lg">Groepen</h2>
            {data?.groups.map((g) => (
              <div key={g.id} className="flex items-center justify-between text-sm">
                <span>{g.emoji} {g.name} <span className="text-muted-foreground">({bandLabel(g.age_group)})</span></span>
                <button className="text-xs text-primary underline" onClick={async () => { await supabase.from("groups").update({ is_archived: !g.is_archived }).eq("id", g.id); refresh(); }}>
                  {g.is_archived ? "Herstellen" : "Archiveren"}
                </button>
              </div>
            ))}
            <Input placeholder="Nieuwe groepsnaam" value={gName} onChange={(e) => setGName(e.target.value)} className="rounded-2xl" />
            <Input placeholder="Beschrijving" value={gDesc} onChange={(e) => setGDesc(e.target.value)} className="rounded-2xl" />
            <div className="flex gap-2">
              {(["junior", "senior", "adult"] as const).map((a) => (
                <Button key={a} variant={gAge === a ? "default" : "outline"} size="sm" className="flex-1 rounded-full" onClick={() => setGAge(a)}>{bandLabel(a)}</Button>
              ))}
            </div>
            <Button disabled={!gName} onClick={addGroup} className="w-full rounded-full">Groep toevoegen</Button>
          </section>
        </div>
      )}

      {tab === "logboek" && (
        <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
          <h2 className="text-lg">Activiteitenlogboek</h2>
          {data?.log.map((e) => (
            <div key={e.id} className="rounded-2xl bg-muted p-3 text-sm">
              <p><span className="font-semibold">{e.actor_id ? data.names[e.actor_id] ?? "Onbekend lid" : "Systeem"}</span> {describe(e.action, e.details as Record<string, unknown> | null)}</p>
              <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("nl-NL")}</p>
            </div>
          ))}
          {data?.log.length === 0 && <p className="text-sm text-muted-foreground">Nog geen activiteit.</p>}
        </section>
      )}
    </div>
  );
}

function describe(action: string, d: Record<string, unknown> | null) {
  const v = (k: string) => String(d?.[k] ?? "");
  switch (action) {
    case "announcement": return `stuurde een aankondiging naar ${v("sent")} apparaten: “${v("title")}”`;
    case "report_status": return `handelde een melding af (${v("from")} → ${v("to")}): “${v("reason")}”`;
    case "group_insert": return `maakte groep “${v("name")}” aan`;
    case "group_update": return `wijzigde groep “${v("name")}”${d?.["is_archived"] ? " (gearchiveerd)" : ""}`;
    case "group_delete": return `verwijderde groep “${v("name")}”`;
    case "challenge_insert": return `zette de opdracht van ${v("challenge_date")}: “${v("title")}”`;
    case "challenge_update": return `paste de opdracht van ${v("challenge_date")} aan: “${v("title")}”`;
    case "challenge_delete": return `verwijderde de opdracht van ${v("challenge_date")}`;
    case "quote_insert": return `zette de quote van ${v("quote_date")}: “${v("text")}”`;
    case "quote_update": return `paste de quote van ${v("quote_date")} aan: “${v("text")}”`;
    case "quote_delete": return `verwijderde de quote van ${v("quote_date")}`;
    case "article_insert": return `plaatste verhaal “${v("title")}”`;
    case "article_update": return `${d?.["is_published"] === false ? "verborg" : "publiceerde"} verhaal “${v("title")}”`;
    case "article_delete": return `verwijderde verhaal “${v("title")}”`;
    default: return action;
  }
}
