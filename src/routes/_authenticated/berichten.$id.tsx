import { createFileRoute, Link } from "@tanstack/react-router";
import { useKindCheck } from "@/components/KindCheck";
import { needsCare, showCareHelp } from "@/lib/care";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore, ArrowLeft, Ban, BellOff, Bell, Check, CheckCheck, Flag, Phone, Video } from "lucide-react";
import { useCall } from "@/components/CallProvider";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useServerFn } from "@tanstack/react-start";
import { notifyNewMessage } from "@/lib/push.functions";
import { UserAvatar } from "@/components/UserAvatar";
import { ChatAudio, ChatVoiceMemo } from "@/components/ChatVoiceMemo";
import { uploadChatAudio } from "@/lib/chat-audio";
import { ChatAttachment, ChatAttachmentPicker } from "@/components/ChatAttachment";
import { attachmentLabel, uploadChatFile } from "@/lib/chat-files";
import { ChatDayDivider } from "@/components/ChatDayDivider";
import { isToday, shortDay, withDayDividers } from "@/lib/chat-dates";
import { GameCard } from "@/components/chat-games/GameCard";
import { GamePicker } from "@/components/chat-games/GamePicker";
import { GameScreen } from "@/components/chat-games/GameScreen";
import type { ChatGameId } from "@/lib/chat-games";
import { startChatGame, useChatGamesLive } from "@/lib/use-chat-games";
import { Reactable, useReactions } from "@/components/chat-extras/reactions";
import { StickerPicker, StickerView } from "@/components/chat-extras/stickers";
import { stickerBody, type StickerId } from "@/lib/stickers";

export const Route = createFileRoute("/_authenticated/berichten/$id")({
  // ?spel=… opens a game straight away (from a "jouw beurt" push).
  validateSearch: (s: Record<string, unknown>): { spel?: string } => (typeof s["spel"] === "string" ? { spel: s["spel"] } : {}),
  head: () => ({ meta: [{ title: "Gesprek — CeritaProject" }, { name: "description", content: "Je privégesprek op CeritaProject." }, { property: "og:title", content: "Gesprek — CeritaProject" }, { property: "og:description", content: "Je privégesprek op CeritaProject." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: ChatPage,
});

function ChatPage() {
  const { id } = Route.useParams();
  const { data: me } = useMe();
  const uid = me?.user.id;
  const qc = useQueryClient();
  const notify = useServerFn(notifyNewMessage);
  const [body, setBody] = useState("");
  const [audio, setAudio] = useState<File | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const { startCall } = useCall();
  const { confirmKind, dialog: kindDialog } = useKindCheck();
  const key = ["chat", id, uid];
  const { spel } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [openGame, setOpenGame] = useState<string | null>(spel ?? null);
  useEffect(() => { if (spel) setOpenGame(spel); }, [spel]);
  useChatGamesLive({ convId: id });

  const { data } = useQuery({
    queryKey: key,
    enabled: !!uid,
    queryFn: async () => {
      const { data: c } = await supabase.from("conversations").select("*").eq("id", id).maybeSingle();
      if (!c) return null;
      const other = c.user_a === uid ? c.user_b : c.user_a;
      const [p, m, b, pr, opr] = await Promise.all([
        supabase.from("profiles").select("display_name, avatar_url").eq("id", other).maybeSingle(),
        supabase.from("direct_messages").select("*").eq("conversation_id", id).order("created_at"),
        supabase.from("blocks").select("blocked_id").eq("blocked_id", other).maybeSingle(),
        supabase.from("conversation_prefs").select("muted, archived").eq("user_id", uid!).eq("conversation_id", id).maybeSingle(),
        supabase.rpc("dm_other_read_at", { _conv: id }),
      ]);
      return { other, name: p.data?.display_name ?? "Lid", avatar: p.data?.avatar_url ?? null, msgs: m.data ?? [], blocked: !!b.data, status: c.status as string, muted: !!pr.data?.muted, archived: !!pr.data?.archived, otherReadAt: (opr.data as string | null) ?? null };
    },
  });

  useEffect(() => {
    const ch = supabase.channel(`dm-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["chat", id] }))
      // Leest de ander het gesprek? Dan verschijnt het leesvinkje meteen.
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_prefs", filter: `conversation_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["chat", id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, qc]);

  // Dit gesprek staat open: markeer alles als gelezen (na een kleine pauze,
  // zodat je bij snel achter elkaar binnenkomende berichten niet telkens opschrijft).
  useEffect(() => {
    if (!uid || !data || data.status !== "accepted") return;
    const t = setTimeout(() => {
      supabase
        .from("conversation_prefs")
        .upsert({ user_id: uid, conversation_id: id, muted: data.muted, archived: data.archived, last_read_at: new Date().toISOString() })
        .then(() => qc.invalidateQueries({ queryKey: ["unread"] }));
    }, 400);
    return () => clearTimeout(t);
  }, [uid, id, data?.status, data?.msgs.length, data?.muted, data?.archived, qc]);

  const { map: reactionMap, react } = useReactions({ kind: "dm", ids: (data?.msgs ?? []).map((m) => m.id), channel: id });

  if (data === null) return <p className="pt-6 text-sm text-muted-foreground">Dit gesprek is niet beschikbaar.</p>;
  if (data && data.status !== "accepted")
    return <p className="pt-6 text-sm text-muted-foreground">{data.status === "pending" ? "Dit chatverzoek is nog niet geaccepteerd." : "Dit verzoek is afgewezen."}</p>;
  const refresh = () => qc.invalidateQueries({ queryKey: ["chat", id] });

  async function send() {
    if (!uid || sending || recording || (!body.trim() && !audio && !file)) return;
    if (!(await confirmKind(body))) return;
    setSending(true);
    let path: string | null = null;
    let attachment: Awaited<ReturnType<typeof uploadChatFile>> | null = null;
    try {
      if (audio) path = await uploadChatAudio(audio, uid, "dm", id);
      if (file) attachment = await uploadChatFile(file, uid, "dm", id);
      const fallback = attachment ? attachmentLabel(attachment.attachment_type, attachment.attachment_name) : "🎙️ Spraakmemo";
      const { data: sent, error } = await supabase.from("direct_messages").insert({ conversation_id: id, sender_id: uid, body: body.trim() || fallback, audio_path: path, ...attachment }).select("id").single();
      if (error) throw error;
      if (needsCare(body)) showCareHelp();
      setBody(""); setAudio(null); setFile(null); refresh();
      if (sent) notify({ data: { messageId: sent.id } }).catch(() => {});
    } catch (e) {
      if (path) await supabase.storage.from("chat-audio").remove([path]);
      if (attachment) await supabase.storage.from("chat-files").remove([attachment.attachment_path]);
      toast.error(e instanceof Error ? e.message : "Bericht kon niet worden verstuurd.");
    } finally { setSending(false); }
  }
  async function sendSticker(sticker: StickerId) {
    if (!uid) return;
    const { data: sent, error } = await supabase.from("direct_messages").insert({ conversation_id: id, sender_id: uid, body: stickerBody(sticker), sticker }).select("id").single();
    if (error) { toast.error("Sticker sturen lukte niet."); return; }
    refresh();
    if (sent) notify({ data: { messageId: sent.id } }).catch(() => {});
  }
  async function playGame(game: ChatGameId) {
    try {
      const { game_id, message_id } = await startChatGame(game, { convId: id });
      refresh();
      setOpenGame(game_id);
      notify({ data: { messageId: message_id } }).catch(() => {});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Spelletje starten lukte niet.");
    }
  }
  function closeGame() {
    setOpenGame(null);
    if (spel) navigate({ search: {}, replace: true });
  }
  const nameOf = (pid: string) => (pid === uid ? "Jij" : pid === data?.other ? data.name : "Lid");
  async function setPref(patch: { muted?: boolean; archived?: boolean }) {
    if (!data) return;
    const { error } = await supabase.from("conversation_prefs").upsert({
      user_id: uid!, conversation_id: id,
      muted: patch.muted ?? data.muted, archived: patch.archived ?? data.archived,
    });
    if (error) { toast.error(error.message); return; }
    if (patch.archived) toast.success("Gearchiveerd — je vindt dit gesprek onder 'Gearchiveerd' bij Berichten.");
    refresh();
    qc.invalidateQueries({ queryKey: ["inbox", uid] });
  }
  async function toggleBlock() {
    if (!data) return;
    const res = data.blocked
      ? await supabase.from("blocks").delete().eq("blocker_id", uid!).eq("blocked_id", data.other)
      : await supabase.from("blocks").insert({ blocker_id: uid!, blocked_id: data.other });
    toast[res.error ? "error" : "success"](res.error ? res.error.message : data.blocked ? "Deblokkeerd" : "Geblokkeerd — jullie kunnen elkaar geen berichten meer sturen.");
    refresh();
  }
  async function report(msgId: string, text: string) {
    const { error } = await supabase.from("reports").insert({ reporter_id: uid!, message_id: msgId, reason: `Privébericht van ${data?.name}: "${text.slice(0, 500)}"` });
    toast[error ? "error" : "success"](error ? error.message : "Gemeld. Een beheerder kijkt ernaar.");
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      <div className="flex items-center justify-between">
        <Link to="/berichten" className="flex items-center gap-1 text-sm text-primary"><ArrowLeft className="size-4" /> Terug</Link>
        <div className="flex gap-2">
          <Button size="icon" variant="outline" className="rounded-full" aria-label={data?.muted ? "Dempen uit" : "Dempen"} title={data?.muted ? "Dempen uit" : "Dempen (geen meldingen)"} onClick={() => setPref({ muted: !data?.muted })}>
            {data?.muted ? <BellOff className="size-4" /> : <Bell className="size-4" />}
          </Button>
          <Button size="icon" variant="outline" className="rounded-full" aria-label={data?.archived ? "Uit archief" : "Archiveren"} title={data?.archived ? "Uit archief halen" : "Archiveren"} onClick={() => setPref({ archived: !data?.archived })}>
            {data?.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
          </Button>
          <Button size="sm" variant="outline" className="rounded-full" onClick={toggleBlock}><Ban className="mr-1 size-4" />{data?.blocked ? "Deblokkeren" : "Blokkeren"}</Button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserAvatar path={data?.avatar} name={data?.name ?? "Lid"} userId={data?.other} />
          <h1 className="text-2xl">{data?.name}</h1>
        </div>
        {data && !data.blocked && (
          <div className="flex gap-2">
            <Button size="icon" variant="outline" className="rounded-full" aria-label="Bellen" onClick={() => startCall(id, data.other, false)}><Phone className="size-4" /></Button>
            <Button size="icon" variant="outline" className="rounded-full" aria-label="Videobellen" onClick={() => startCall(id, data.other, true)}><Video className="size-4" /></Button>
          </div>
        )}
      </div>
      <div className="space-y-2">
        {withDayDividers(data?.msgs ?? [], (m) => m.created_at).map((row) => {
          if (row.kind === "day") return <ChatDayDivider key={row.key} label={row.label} />;
          const m = row.item;
          const mine = m.sender_id === uid;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <Reactable className="max-w-[80%]" reactions={reactionMap.get(m.id) ?? []} uid={uid} mine={mine} enabled={!data?.blocked} onReact={(e) => uid && react(m.id, e, uid)}>
              <div className={`max-w-full rounded-2xl px-3 py-2 text-sm ${m.sticker ? "bg-transparent" : mine ? "bg-primary text-primary-foreground" : "bg-card shadow-soft"}`}>
                {m.sticker
                  ? <StickerView id={m.sticker} />
                  : m.game_id
                  ? <GameCard gameId={m.game_id} uid={uid} nameOf={nameOf} onOpen={() => setOpenGame(m.game_id)} />
                  : <p className="whitespace-pre-wrap">{m.body}</p>}
                {m.audio_path && <ChatAudio path={m.audio_path} />}
                {m.attachment_path && <ChatAttachment path={m.attachment_path} name={m.attachment_name} type={m.attachment_type} />}
                <div className="mt-1 flex items-center gap-2 text-[10px] opacity-70">
                  {!isToday(m.created_at) && <span>{shortDay(m.created_at)}</span>}
                  {new Date(m.created_at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                  {mine && (data?.otherReadAt && data.otherReadAt > m.created_at
                    ? <span className="flex items-center gap-0.5" title="Gelezen"><CheckCheck className="size-3.5" /> Gelezen</span>
                    : <Check className="size-3.5" aria-label="Verstuurd" />)}
                  {!mine && <button aria-label="Melden" onClick={() => report(m.id, m.body)}><Flag className="size-3" /></button>}
                </div>
              </div>
              </Reactable>
            </div>
          );
        })}
        {data?.msgs.length === 0 && <p className="text-sm text-muted-foreground">Zeg hallo 👋</p>}
      </div>
      <Textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Typ een bericht…" className="rounded-2xl" />
      <div className="flex flex-wrap items-center gap-2">
        <ChatAttachmentPicker file={file} onChange={setFile} disabled={sending || !!data?.blocked || !data} />
        <ChatVoiceMemo file={audio} onChange={setAudio} disabled={sending || !!data?.blocked || !data} onRecordingChange={setRecording} />
        <StickerPicker onPick={sendSticker} disabled={sending || !!data?.blocked || !data} />
        <GamePicker onPick={playGame} disabled={sending || !!data?.blocked || !data} />
      </div>
      <Button disabled={sending || recording || (!body.trim() && !audio && !file) || data?.blocked || !data} onClick={send} className="rounded-full">{sending ? "Versturen…" : "Versturen"}</Button>
      {kindDialog}
      {openGame && <GameScreen gameId={openGame} uid={uid} nameOf={nameOf} onClose={closeGame} onRematch={playGame} />}
    </div>
  );
}
