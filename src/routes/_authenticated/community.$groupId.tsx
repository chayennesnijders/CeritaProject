import { Shield } from "lucide-react";
import { needsCare, showCareHelp } from "@/lib/care";
import { useAdminIds } from "@/components/UserAvatar";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { GroupMembersAdmin } from "@/components/GroupMembersAdmin";
import { GroupForm } from "@/components/GroupForm";
import { toast } from "sonner";
import { ArrowLeft, Check, CheckCheck, Flag, Reply, Send, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { parseMentions, splitMentions, type Mentionable } from "@/lib/groups";
import { useServerFn } from "@tanstack/react-start";
import { notifyGroupMention, notifyGroupReply } from "@/lib/push.functions";
import { Button } from "@/components/ui/button";
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
import { PollCard, PollComposer, usePollsLive } from "@/components/chat-extras/polls";
import { GroupChallenge } from "@/components/chat-extras/GroupChallenge";
import { stickerBody, type StickerId } from "@/lib/stickers";

export const Route = createFileRoute("/_authenticated/community/$groupId")({
  // ?spel=… opens a game straight away (from a "jouw beurt" push).
  validateSearch: (s: Record<string, unknown>): { spel?: string } => (typeof s["spel"] === "string" ? { spel: s["spel"] } : {}),
  head: () => ({ meta: [{ title: "Groep — CeritaProject" }, { name: "description", content: "Praat mee in je communitygroep op CeritaProject." }, { property: "og:title", content: "Groep — CeritaProject" }, { property: "og:description", content: "Praat mee in je communitygroep op CeritaProject." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: GroupPage,
});

// Het toetsenbord van een telefoon bedekt de onderkant van het scherm.
// Deze hook meet hoeveel en houdt het berichtenveld er net boven.
function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const read = () => setInset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    read();
    vv.addEventListener("resize", read);
    vv.addEventListener("scroll", read);
    return () => {
      vv.removeEventListener("resize", read);
      vv.removeEventListener("scroll", read);
    };
  }, []);
  return inset;
}

function GroupPage() {
  const { data: admins } = useAdminIds();
  const { groupId } = Route.useParams();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [replyTo, setReplyTo] = useState<{ id: string; name: string; body: string } | null>(null);
  const uid = me?.user.id;
  const notifyReply = useServerFn(notifyGroupReply);
  const notifyMention = useServerFn(notifyGroupMention);
  const bottomRef = useRef<HTMLDivElement>(null);
  const seenPosts = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Het toetsenbord van de telefoon schuift het berichtenveld omhoog; het gesprek blijft erboven staan.
  const inset = useKeyboardInset();
  const { spel } = Route.useSearch();
  const navigate = Route.useNavigate();
  const goTo = useNavigate();
  const [editing, setEditing] = useState(false);
  const [openGame, setOpenGame] = useState<string | null>(spel ?? null);
  useEffect(() => { if (spel) setOpenGame(spel); }, [spel]);
  useChatGamesLive({ groupId });
  usePollsLive(groupId);

  const { data } = useQuery({
    queryKey: ["group", groupId, uid],
    enabled: !!uid,
    queryFn: async () => {
      const [g, m, p, mem, reads] = await Promise.all([
        supabase.from("groups").select("*").eq("id", groupId).maybeSingle(),
        supabase.from("group_members").select("user_id").eq("group_id", groupId).eq("user_id", uid!).maybeSingle(),
        supabase.from("posts").select("*, author:profiles(display_name), post_comments(id, body, author_id, created_at, author:profiles(display_name))")
          .eq("group_id", groupId).order("created_at", { ascending: false }),
        supabase.from("group_members").select("user_id, profiles(display_name, username)").eq("group_id", groupId),
        supabase.from("group_reads").select("user_id, last_read_at").eq("group_id", groupId),
      ]);
      const members: Mentionable[] = (mem.data ?? []).map((r) => ({
        user_id: r.user_id,
        display_name: (r.profiles as { display_name?: string } | null)?.display_name ?? "Lid",
        username: (r.profiles as { username?: string | null } | null)?.username ?? null,
      }));
      return { group: g.data, isMember: !!m.data, posts: p.data ?? [], members, reads: reads.data ?? [] };
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["group", groupId] });

  // Live groepschat: nieuwe of verwijderde berichten verschijnen meteen.
  useEffect(() => {
    const ch = supabase.channel(`group-${groupId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "posts", filter: `group_id=eq.${groupId}` },
        () => qc.invalidateQueries({ queryKey: ["group", groupId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [groupId, qc]);

  // Terugkomen uit een ander app-venster: even ophalen zodat niets ontbreekt.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") qc.invalidateQueries({ queryKey: ["group", groupId] }); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [groupId, qc]);

  // Deze groepschat staat open: markeer alles als gelezen (met een kleine pauze
  // zodat snel achter elkaar binnenkomende berichten niet telkens opschrijven).
  useEffect(() => {
    if (!uid || !data?.isMember) return;
    const t = setTimeout(() => {
      supabase
        .from("group_reads")
        .upsert({ user_id: uid, group_id: groupId, last_read_at: new Date().toISOString() })
        .then(() => qc.invalidateQueries({ queryKey: ["unread"] }));
    }, 400);
    return () => clearTimeout(t);
  }, [uid, groupId, data?.isMember, data?.posts?.length, qc]);

  const { map: reactionMap, react } = useReactions({ kind: "post", ids: (data?.posts ?? []).map((p) => p.id).reverse(), channel: groupId });

  if (data && !data.group) return <p className="pt-6 text-sm text-muted-foreground">Deze groep is niet beschikbaar voor jou.</p>;

  async function toggleJoin() {
    const { error } = data?.isMember
      ? await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", uid!)
      : await supabase.from("group_members").insert({ group_id: groupId, user_id: uid! });
    if (error) toast.error(error.message);
    refresh(); qc.invalidateQueries({ queryKey: ["groups"] });
  }
  async function post(text: string, audio: File | null, file: File | null) {
    if (!uid) return false;
    let path: string | null = null;
    let attachment: Awaited<ReturnType<typeof uploadChatFile>> | null = null;
    try {
    if (audio) path = await uploadChatAudio(audio, uid, "group", groupId);
    if (file) attachment = await uploadChatFile(file, uid, "group", groupId);
    const mentions = parseMentions(text, data?.members ?? []);
    const fallback = attachment ? attachmentLabel(attachment.attachment_type, attachment.attachment_name) : "🎙️ Spraakmemo";
    const { data: created, error } = await supabase.from("posts").insert({ group_id: groupId, author_id: uid, body: text || fallback, audio_path: path, ...attachment, reply_to: replyTo?.id ?? null, mentions }).select("id").single();
    if (error) throw error;
    if (needsCare(text)) showCareHelp();
    if (replyTo && created) notifyReply({ data: { postId: created.id } }).catch(() => {});
    if (created && mentions.length > 0) notifyMention({ data: { postId: created.id } }).catch(() => {});
    setReplyTo(null); refresh();
    return true;
    } catch (e) {
      if (path) await supabase.storage.from("chat-audio").remove([path]);
      if (attachment) await supabase.storage.from("chat-files").remove([attachment.attachment_path]);
      toast.error(e instanceof Error ? e.message : "Plaatsen lukte niet");
      return false;
    }
  }
  async function saveGroup(v: { name: string; description: string; emoji: string }) {
    const { error } = await supabase.rpc("update_my_group", { _group: groupId, _name: v.name, _description: v.description, _emoji: v.emoji });
    if (error) { toast.error(error.message); return; }
    setEditing(false); refresh(); qc.invalidateQueries({ queryKey: ["groups"] });
    toast.success("Opgeslagen");
  }
  async function closeGroup() {
    const { error } = await supabase.rpc("close_my_group", { _group: groupId });
    if (error) { toast.error(error.message); return; }
    setEditing(false); qc.invalidateQueries({ queryKey: ["groups"] });
    toast.success("De groep is opgeheven.");
    goTo({ to: "/community" });
  }
  async function sendSticker(sticker: StickerId) {
    if (!uid) return;
    const { error } = await supabase.from("posts").insert({ group_id: groupId, author_id: uid, body: stickerBody(sticker), sticker });
    if (error) { toast.error("Sticker sturen lukte niet."); return; }
    refresh();
  }
  async function playGame(game: ChatGameId) {
    try {
      const { game_id } = await startChatGame(game, { groupId });
      refresh();
      setOpenGame(game_id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Spelletje starten lukte niet.");
    }
  }
  function closeGame() {
    setOpenGame(null);
    if (spel) navigate({ search: {}, replace: true });
  }
  const nameOf = (pid: string) => (pid === uid ? "Jij" : data?.members.find((m) => m.user_id === pid)?.display_name ?? "Lid");
  async function report(postId: string) {
    const reason = prompt("Waarom meld je dit bericht?");
    if (!reason) return;
    const { error } = await supabase.from("reports").insert({ post_id: postId, reporter_id: uid!, reason });
    toast[error ? "error" : "success"](error ? "Melden lukte niet" : "Bedankt, een beheerder kijkt ernaar.");
  }
  async function remove(postId: string) {
    await supabase.from("posts").delete().eq("id", postId); refresh();
  }

  const posts = [...(data?.posts ?? [])].reverse();

  // Nieuw bericht? Blijf onderaan als je daar al stond, of als het bericht van jou is.
  useEffect(() => {
    const n = posts.length;
    const first = seenPosts.current === 0;
    const grew = n > seenPosts.current;
    seenPosts.current = n;
    if (!grew) return;
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 240;
    const mine = posts[n - 1]?.author_id === uid;
    if (first || nearBottom || mine) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [posts.length, posts, uid]);

  // Toetsenbord open of dicht? Blijf op het nieuwste bericht staan als je daar al stond.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 300) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [inset]);

  return (
    <div className="fixed inset-0 z-40 mx-auto flex max-w-md flex-col bg-background">
      {/* Compacte kop: blijft altijd in beeld, met vaste terugknop naar de groepen */}
      <header className="flex shrink-0 items-center gap-2 bg-ink px-3 py-2 text-ink-foreground">
        <Link to="/community" aria-label="Terug naar de groepen"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground/15 active:scale-95">
          <ArrowLeft className="size-5" />
        </Link>
        <p className="shrink-0 text-xl">{data?.group?.emoji ?? "💬"}</p>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base leading-tight">{data?.group?.name ?? "Groep"}</h1>
          <p className="truncate text-[11px] opacity-70">{data?.group?.description}</p>
        </div>
        {data?.group && data.group.created_by === uid && (
          <button onClick={() => setEditing(true)} aria-label="Groep aanpassen"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground/15 active:scale-95">⚙️</button>
        )}
        {data?.group && (
          <Button onClick={toggleJoin} variant="secondary" className="shrink-0 rounded-full px-3 py-1 text-xs">
            {data.isMember ? "Verlaten" : "Lid worden"}
          </Button>
        )}
      </header>

      {/* Berichten: eigen scrollgebied dat vanzelf op het nieuwste bericht valt */}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {data?.group && me?.isAdmin && <GroupMembersAdmin groupId={groupId} ageGroup={data.group.age_group} />}
        {data?.group && data?.isMember && !me?.isAdmin && <GroupMembersAdmin groupId={groupId} ageGroup={data.group.age_group} mode="member" />}
        {data?.group && <GroupChallenge groupId={groupId} uid={uid} isMember={!!data.isMember} />}
        {data?.isMember && posts.length > 0 && <p className="text-center text-[11px] text-muted-foreground">Swipe naar rechts om te antwoorden · houd ingedrukt voor een emoji</p>}
        {withDayDividers(posts, (p) => p.created_at).map((row) => {
          if (row.kind === "day") return <ChatDayDivider key={row.key} label={row.label} />;
          const p = row.item;
          const mine = p.author_id === uid;
          const quoted = p.reply_to ? posts.find((x) => x.id === p.reply_to) ?? null : null;
          return (
            <SwipeRow key={p.id} enabled={!!data?.isMember} onReply={() => setReplyTo({ id: p.id, name: p.author?.display_name ?? "Lid", body: p.body })} mine={mine}>
              <Reactable className="max-w-[85%]" reactions={reactionMap.get(p.id) ?? []} uid={uid} mine={mine} enabled={!!data?.isMember && !p.is_hidden} onReact={(e) => uid && react(p.id, e, uid)}>
              <article className={`max-w-full rounded-2xl p-3 shadow-soft ${mine ? "bg-accent" : "bg-card"}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold" style={{ color: colorFor(p.author_id) }}>{mine ? "Jij" : p.author?.display_name ?? "Lid"}{admins?.has(p.author_id) && <Shield aria-label="Beheerder" className="ml-1 inline size-3.5 text-foreground" fill="currentColor" />}</p>
                  <div className="flex shrink-0 gap-1">
                    {data?.isMember && <button aria-label="Reageren" onClick={() => setReplyTo({ id: p.id, name: p.author?.display_name ?? "Lid", body: p.body })} className="p-1 text-muted-foreground"><Reply className="size-4" /></button>}
                    {(mine || me?.isAdmin) && <button aria-label="Verwijderen" onClick={() => remove(p.id)} className="p-1 text-muted-foreground"><Trash2 className="size-4" /></button>}
                    {!mine && <button aria-label="Melden" onClick={() => report(p.id)} className="p-1 text-muted-foreground"><Flag className="size-4" /></button>}
                  </div>
                </div>
                {quoted && (
                  <div className="mt-1 rounded-lg bg-muted/70 px-2 py-1 text-xs border-l-4" style={{ borderColor: colorFor(quoted.author_id) }}>
                    <p className="font-semibold" style={{ color: colorFor(quoted.author_id) }}>{quoted.author?.display_name ?? "Lid"}</p>
                    <p className="line-clamp-2 text-muted-foreground">{quoted.body}</p>
                  </div>
                )}
                {p.reply_to && !quoted && <p className="mt-1 text-xs italic text-muted-foreground">Reactie op een verwijderd bericht</p>}
                {p.is_hidden && <p className="text-xs text-destructive">Verborgen door moderatie</p>}
                {p.sticker && !p.is_hidden ? <StickerView id={p.sticker} /> : p.poll_id && !p.is_hidden ? <PollCard pollId={p.poll_id} uid={uid} canVote={!!data?.isMember} /> : p.game_id && !p.is_hidden ? <GameCard gameId={p.game_id} uid={uid} nameOf={nameOf} onOpen={() => setOpenGame(p.game_id)} /> : <p className="mt-1 whitespace-pre-wrap text-sm">
                  {splitMentions(p.body).map((part, i) =>
                    part.mention ? (
                      <span key={i} className="rounded-md bg-primary/15 px-1 font-semibold text-primary">{part.text}</span>
                    ) : (
                      <span key={i}>{part.text}</span>
                    ),
                  )}
                </p>}
                {p.audio_path && !p.is_hidden && <ChatAudio path={p.audio_path} />}
                {p.attachment_path && !p.is_hidden && <ChatAttachment path={p.attachment_path} name={p.attachment_name} type={p.attachment_type} />}
                <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                  {!isToday(p.created_at) && <span>{shortDay(p.created_at)}</span>}
                  {new Date(p.created_at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                  {mine && <ReadMark readers={readersOf(p.created_at)} />}
                </p>
              </article>
              </Reactable>
            </SwipeRow>
          );
        })}
        {data && data.posts.length === 0 && <p className="pt-6 text-center text-sm text-muted-foreground">Nog geen berichten. Wees de eerste!</p>}
        <div ref={bottomRef} />
      </div>
      {data?.group && data.group.created_by === uid && (
        <GroupForm open={editing} onOpenChange={setEditing} onSubmit={saveGroup} onCloseGroup={closeGroup}
          initial={{ name: data.group.name, description: data.group.description ?? "", emoji: data.group.emoji ?? "💬" }} />
      )}
      {openGame && <GameScreen gameId={openGame} uid={uid} nameOf={nameOf} onClose={closeGame} onRematch={playGame} />}

      {data?.isMember && <ChatComposer onGame={playGame} onSticker={sendSticker} groupId={groupId} onPoll={refresh} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} onSend={post} inset={inset} members={(data.members ?? []).filter((m) => m.user_id !== uid)} />}
    </div>
  );

  // Hoeveel groepsleden (behalve jij) dit bericht al hebben gezien.
  function readersOf(createdAt: string) {
    return (data?.reads ?? []).filter((r) => r.user_id !== uid && r.last_read_at > createdAt).length;
  }
}

// Leesvinkje bij je eigen bericht: één vinkje = verstuurd, dubbel roze vinkje = gelezen.
function ReadMark({ readers }: { readers: number }) {
  if (readers > 0)
    return (
      <span className="flex items-center gap-0.5 text-primary" title={`Gelezen door ${readers} ${readers === 1 ? "lid" : "leden"}`}>
        <CheckCheck className="size-3.5" /> {readers}
      </span>
    );
  return <Check className="size-3.5" aria-label="Verstuurd" />;
}

function ChatComposer({ replyTo, onCancelReply, onSend, inset, members, onGame, onSticker, groupId, onPoll }: {
  onGame: (game: ChatGameId) => Promise<void>;
  onSticker: (sticker: StickerId) => Promise<void>;
  groupId: string;
  onPoll: () => void;
  replyTo: { id: string; name: string; body: string } | null;
  onCancelReply: () => void;
  onSend: (text: string, audio: File | null, file: File | null) => Promise<boolean>;
  inset: number;
  members: Mentionable[];
}) {
  const [body, setBody] = useState("");
  const [audio, setAudio] = useState<File | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Typ je @? Dan verschijnt een lijstje met groepsleden om te taggen.
  const atMatch = /(?:^|\s)@([A-Za-z0-9_.-]*)$/.exec(body);
  const suggestions = atMatch
    ? members
        .filter((m) => {
          const q = atMatch[1]!.toLowerCase();
          return (m.username ?? "").toLowerCase().startsWith(q) || m.display_name.toLowerCase().replace(/\s+/g, "").startsWith(q);
        })
        .slice(0, 5)
    : [];

  function pickMember(m: Mentionable) {
    const tag = m.username ?? m.display_name.replace(/\s+/g, "");
    setBody((b) => b.replace(/@[A-Za-z0-9_.-]*$/, `@${tag} `));
    taRef.current?.focus();
  }

  // Het veld groeit mee met je tekst, van één regel tot een paar regels.
  useLayoutEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(120, Math.max(40, ta.scrollHeight))}px`;
  }, [body]);

  // Iemand aanklikken om te reageren? Zet de cursor meteen in het veld.
  useEffect(() => { if (replyTo) taRef.current?.focus(); }, [replyTo]);

  async function submit() {
    const text = body.trim();
    if (sending || recording || (!text && !audio && !file)) return;
    setSending(true);
    try { if (await onSend(text, audio, file)) { setBody(""); setAudio(null); setFile(null); } }
    finally { setSending(false); }
  }

  return (
    <div className="shrink-0 border-t border-border/30 bg-background px-3 pt-2"
      style={{ paddingBottom: `calc(max(env(safe-area-inset-bottom), 0.75rem) + ${inset}px)`, transition: "padding-bottom 0.15s ease-out" }}>
      {suggestions.length > 0 && (
        <div className="mb-2 overflow-hidden rounded-2xl bg-card shadow-soft">
          {suggestions.map((m) => (
            <button key={m.user_id} type="button" onClick={() => pickMember(m)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm active:bg-muted">
              <span className="font-semibold text-primary">@{m.username ?? m.display_name.replace(/\s+/g, "")}</span>
              <span className="text-muted-foreground">{m.display_name}</span>
            </button>
          ))}
        </div>
      )}
      <div className="rounded-3xl bg-card p-2 shadow-soft">
        {replyTo && (
          <div className="mb-2 flex items-start justify-between rounded-xl bg-muted px-3 py-2 text-xs">
            <div className="min-w-0"><p className="font-semibold">Reageer op {replyTo.name}</p><p className="line-clamp-1 text-muted-foreground">{replyTo.body}</p></div>
            <button aria-label="Annuleren" onClick={onCancelReply} className="shrink-0 p-1"><X className="size-4" /></button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea ref={taRef} disabled={sending} value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={1}
            enterKeyHint="send" placeholder="Typ een bericht…"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            className="min-h-10 min-w-0 flex-1 resize-none rounded-2xl border border-input bg-background px-3 py-2 text-sm" />
          <Button size="icon" onClick={submit} disabled={sending || recording || (!body.trim() && !audio && !file)} aria-label="Versturen" title="Versturen" className="shrink-0">
            <Send className="size-4" />
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ChatAttachmentPicker file={file} onChange={setFile} disabled={sending} />
          <ChatVoiceMemo file={audio} onChange={setAudio} disabled={sending} onRecordingChange={setRecording} />
          <StickerPicker onPick={onSticker} disabled={sending} />
          <PollComposer groupId={groupId} onCreated={onPoll} disabled={sending} />
          <GamePicker onPick={onGame} disabled={sending} inGroup />
        </div>
      </div>
    </div>
  );
}

function colorFor(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `var(--chat-${(h % 6) + 1})`;
}

function SwipeRow({ children, onReply, enabled, mine }: { children: React.ReactNode; onReply: () => void; enabled: boolean; mine: boolean }) {
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  return (
    <div
      className={`relative flex ${mine ? "justify-end" : "justify-start"}`}
      onTouchStart={(e) => { if (enabled) start.current = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY }; }}
      onTouchMove={(e) => {
        if (!start.current) return;
        const x = e.touches[0]!.clientX - start.current.x;
        const y = Math.abs(e.touches[0]!.clientY - start.current.y);
        if (y > 30) { start.current = null; setDx(0); return; }
        setDx(Math.max(0, Math.min(80, x)));
      }}
      onTouchEnd={() => { if (dx > 55) { onReply(); navigator.vibrate?.(15); } setDx(0); start.current = null; }}
    >
      {dx > 10 && <Reply className="absolute left-1 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" style={{ opacity: dx / 60 }} />}
      <div className="contents">
        <div style={{ transform: `translateX(${dx}px)`, transition: dx ? "none" : "transform 0.2s" }} className={`flex w-full ${mine ? "justify-end" : "justify-start"}`}>{children}</div>
      </div>
    </div>
  );
}
