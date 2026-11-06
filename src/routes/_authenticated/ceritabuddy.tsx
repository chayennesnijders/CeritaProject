import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, MessageSquarePlus, Pencil, Send, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { Riti } from "@/components/Riti";
import { Button } from "@/components/ui/button";
import {
  ageBracket,
  BUDDY_LINKS,
  BUDDY_MAX_MESSAGE,
  BUDDY_MODES,
  limitStage,
  parseReply,
  visibleWhileStreaming,
  type BuddyModeId,
} from "@/lib/ceritabuddy";
import { listStamp } from "@/lib/chat-dates";

export const Route = createFileRoute("/_authenticated/ceritabuddy")({
  head: () => ({
    meta: [
      { title: "CeritaBuddy — CeritaProject" },
      { name: "description", content: "Praat met CeritaBuddy, je AI-gesprekspartner in CeritaProject." },
    ],
  }),
  component: BuddyPage,
});

type Msg = { id: string; role: "user" | "assistant"; content: string; safety: boolean; created_at: string };
type Status = { enabled: boolean; daily_limit: number; used_today: number };

function BuddyPage() {
  const { data: me } = useMe();
  const uid = me?.user.id;
  const qc = useQueryClient();
  const [convId, setConvId] = useState<string | null>(null);
  // Changes only when you open another conversation or start a new one (not when a new one gets its id).
  const [chatKey, setChatKey] = useState(0);
  const [showList, setShowList] = useState(false);

  const { data: accepted, isLoading: prefsLoading } = useQuery({
    queryKey: ["buddy-prefs", uid],
    enabled: !!uid,
    queryFn: async () =>
      !!(await supabase.from("buddy_prefs").select("accepted_at").eq("user_id", uid!).maybeSingle()).data
        ?.accepted_at,
  });
  const { data: status } = useQuery({
    queryKey: ["buddy-status", uid],
    enabled: !!uid,
    queryFn: async () => (await supabase.rpc("buddy_status")).data as unknown as Status | null,
  });

  if (!uid || prefsLoading) return <p className="pt-6 text-sm text-muted-foreground">Laden…</p>;
  if (status && !status.enabled)
    return (
      <div className="space-y-3 pt-4 text-center">
        <Riti size={120} expression="denkend" className="mx-auto" />
        <p className="text-sm font-semibold">CeritaBuddy staat even uit</p>
        <p className="text-sm text-muted-foreground">Probeer het later nog eens. Wil je nu met iemand praten?</p>
        <Link to="/vragen" className="inline-block rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">🎓 Naar de coaches</Link>
      </div>
    );
  if (!accepted)
    return (
      <Intro
        onAccept={async () => {
          const { error } = await supabase
            .from("buddy_prefs")
            .upsert({ user_id: uid, accepted_at: new Date().toISOString() });
          if (error) {
            toast.error("Dat lukte niet. Probeer het nog eens.");
            return;
          }
          qc.invalidateQueries({ queryKey: ["buddy-prefs", uid] });
        }}
      />
    );

  return (
    <div className="flex flex-col gap-3 pt-2">
      <header className="flex items-center gap-2">
        {showList ? (
          <button onClick={() => setShowList(false)} className="flex items-center gap-1 text-sm text-primary">
            <ArrowLeft className="size-4" /> Terug
          </button>
        ) : (
          <>
            <img src="/riti/blij.webp" alt="" className="size-11 rounded-full bg-secondary object-contain" />
            <div className="min-w-0 flex-1">
              <h1 className="truncate pb-0.5 font-display text-xl leading-normal">CeritaBuddy</h1>
              <p className="truncate text-[11px] text-muted-foreground">AI · geen mens of hulpverlener</p>
            </div>
          </>
        )}
        <div className="ml-auto flex gap-1.5">
          {!showList && (
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => setShowList(true)}>
              Gesprekken
            </Button>
          )}
          <Button
            size="icon"
            className="rounded-full"
            aria-label="Nieuw gesprek"
            title="Nieuw gesprek"
            onClick={() => {
              setConvId(null);
              setChatKey((k) => k + 1);
              setShowList(false);
            }}
          >
            <MessageSquarePlus className="size-4" />
          </Button>
        </div>
      </header>
      {showList ? (
        <ConversationList
          uid={uid}
          current={convId}
          onOpen={(id) => {
            setConvId(id);
            setChatKey((k) => k + 1);
            setShowList(false);
          }}
          onDeleted={(id) => {
            if (id === null || id === convId) {
              setConvId(null);
              setChatKey((k) => k + 1);
            }
          }}
        />
      ) : (
        <Chat
          key={chatKey}
          uid={uid}
          convId={convId}
          onConversation={setConvId}
          status={status ?? null}
          young={ageBracket(me?.profile?.birthdate) === "13-15" || ageBracket(me?.profile?.birthdate) === "16-18"}
          groups={ageBracket(me?.profile?.birthdate) !== "28+"}
        />
      )}
    </div>
  );
}

/** First visit: what CeritaBuddy is and isn't, and what happens with your messages. */
function Intro({ onAccept }: { onAccept: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-4 pt-2">
      <div className="flex flex-col items-center text-center">
        <Riti size={130} expression="blij" wave />
        <h1 className="mt-1 font-display text-2xl">Hoi! Ik ben CeritaBuddy</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Je hoeft niet precies te weten wat je voelt of wat je moet zeggen. Je kunt gewoon beginnen.
        </p>
      </div>
      <div className="space-y-3 rounded-3xl bg-card p-5 text-sm shadow-soft">
        <p className="font-semibold">Even goed om te weten</p>
        <p>🤖 <b>Ik ben een AI</b>, geen mens, geen echte vriend en geen hulpverlener. Ik kan luisteren, meedenken en je helpen dingen op een rijtje te zetten, maar ik kan me ook vergissen.</p>
        <p>🔒 <b>Je gesprekken zijn alleen van jou.</b> Ook de beheerders van CeritaProject kunnen ze niet lezen. Je kunt ze altijd zelf verwijderen. Een gesprek waar je 90 dagen niets in doet, verdwijnt vanzelf.</p>
        <p>🌍 <b>Hoe het werkt:</b> om te kunnen antwoorden gaan je berichten naar Anthropic, het bedrijf achter de AI Claude. We sturen niet je naam of geboortedatum mee, alleen je leeftijdsgroep. Anthropic gebruikt je berichten niet om zijn AI te trainen en verwijdert ze standaard binnen 30 dagen. Deel liever geen achternaam, adres of telefoonnummer.</p>
        <p>🆘 <b>Ben je in gevaar?</b> Ik ben geen hulplijn. Bel 112 bij direct gevaar, of 113 (0800-0113) als je aan zelfmoord denkt. Je kunt ook altijd naar <Link to="/hulp" className="font-semibold underline">Hulp</Link>.</p>
      </div>
      <Button
        className="w-full rounded-full"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await onAccept();
          setBusy(false);
        }}
      >
        Ik snap het, laten we praten 💬
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Meer hierover lees je in de <Link to="/privacy" className="underline">privacyverklaring</Link>.
      </p>
    </div>
  );
}

function ConversationList({
  uid,
  current,
  onOpen,
  onDeleted,
}: {
  uid: string;
  current: string | null;
  onOpen: (id: string) => void;
  onDeleted: (id: string | null) => void;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const { data: convs, isLoading } = useQuery({
    queryKey: ["buddy-convs", uid],
    queryFn: async () =>
      (
        await supabase
          .from("buddy_conversations")
          .select("id, title, updated_at")
          .order("updated_at", { ascending: false })
      ).data ?? [],
  });

  async function rename(id: string) {
    const t = title.trim().slice(0, 80);
    if (!t) return;
    const { error } = await supabase.from("buddy_conversations").update({ title: t }).eq("id", id);
    if (error) toast.error("Naam aanpassen lukte niet.");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["buddy-convs", uid] });
  }
  async function remove(id: string | "alles") {
    const q = supabase.from("buddy_conversations").delete();
    const { data, error } = await (id === "alles" ? q.eq("user_id", uid) : q.eq("id", id)).select("id");
    setConfirm(null);
    if (error || !data?.length) {
      toast.error("Verwijderen lukte niet.");
      return;
    }
    toast.success(id === "alles" ? "Al je gesprekken zijn verwijderd." : "Gesprek verwijderd.");
    onDeleted(id === "alles" ? null : id);
    qc.invalidateQueries({ queryKey: ["buddy-convs", uid] });
    qc.removeQueries({ queryKey: ["buddy-msgs"] });
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Laden…</p>;
  if (!convs?.length)
    return <p className="rounded-3xl bg-card p-5 text-center text-sm text-muted-foreground shadow-soft">Je hebt nog geen gesprekken.</p>;
  return (
    <div className="space-y-2">
      <h2 className="text-lg">Mijn gesprekken</h2>
      {convs.map((c) => (
        <div key={c.id} className={`rounded-3xl bg-card p-3 shadow-soft ${c.id === current ? "ring-2 ring-primary/60" : ""}`}>
          {editing === c.id ? (
            <div className="flex items-center gap-2">
              <input
                id={`titel-${c.id}`}
                autoFocus
                value={title}
                maxLength={80}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && rename(c.id)}
                className="h-9 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm"
              />
              <button aria-label="Opslaan" onClick={() => rename(c.id)} className="p-1.5 text-primary"><Check className="size-4" /></button>
              <button aria-label="Annuleren" onClick={() => setEditing(null)} className="p-1.5"><X className="size-4" /></button>
            </div>
          ) : confirm === c.id ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="flex-1">Dit gesprek verwijderen? Dit kan niet terug.</span>
              <Button size="sm" variant="destructive" className="rounded-full" onClick={() => remove(c.id)}>Verwijderen</Button>
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => setConfirm(null)}>Nee</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => onOpen(c.id)} className="min-w-0 flex-1 text-left">
                <p className="truncate font-semibold">{c.title}</p>
                <p className="text-xs text-muted-foreground">{listStamp(c.updated_at)}</p>
              </button>
              <button aria-label="Naam aanpassen" title="Naam aanpassen" onClick={() => { setEditing(c.id); setTitle(c.title); }} className="p-1.5 text-muted-foreground"><Pencil className="size-4" /></button>
              <button aria-label="Verwijderen" title="Verwijderen" onClick={() => setConfirm(c.id)} className="p-1.5 text-muted-foreground"><Trash2 className="size-4" /></button>
            </div>
          )}
        </div>
      ))}
      {confirm === "alles" ? (
        <div className="flex flex-wrap items-center gap-2 rounded-3xl bg-card p-3 text-sm shadow-soft">
          <span className="flex-1">Al je gesprekken met CeritaBuddy verwijderen?</span>
          <Button size="sm" variant="destructive" className="rounded-full" onClick={() => remove("alles")}>Alles verwijderen</Button>
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => setConfirm(null)}>Nee</Button>
        </div>
      ) : (
        <button onClick={() => setConfirm("alles")} className="w-full pt-2 text-center text-xs text-muted-foreground underline">
          Alle gesprekken verwijderen
        </button>
      )}
    </div>
  );
}

function Chat({
  uid,
  convId,
  onConversation,
  status,
  young,
  groups,
}: {
  uid: string;
  convId: string | null;
  onConversation: (id: string) => void;
  status: Status | null;
  young: boolean;
  groups: boolean;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<string | null>(null); // your message while the answer comes in
  const [stream, setStream] = useState<string | null>(null);
  const [failed, setFailed] = useState<{ message: string; error: string; retry: boolean; again: boolean } | null>(null);
  const [safety, setSafety] = useState<"none" | "zorg" | "acuut">("none");
  const [mode, setMode] = useState<BuddyModeId | null>(null);
  const convRef = useRef(convId);
  const bottom = useRef<HTMLDivElement>(null);

  const { data: msgs = [], isLoading } = useQuery({
    queryKey: ["buddy-msgs", convId],
    enabled: !!convId,
    // Only this screen changes a conversation, so it reloads it itself after each answer.
    staleTime: Infinity,
    queryFn: async () =>
      ((
        await supabase
          .from("buddy_messages")
          .select("id, role, content, safety, created_at")
          .eq("conversation_id", convId!)
          .order("created_at")
      ).data ?? []) as Msg[],
  });

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [msgs.length, pending, stream, failed]);

  async function send(message: string, opts: { retry?: boolean; mode?: BuddyModeId | null } = {}) {
    const clean = message.trim();
    if (!clean || busy) return;
    setBusy(true);
    setFailed(null);
    setPending(opts.retry ? null : clean);
    setStream("");
    setText("");
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch("/api/buddy", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
        body: JSON.stringify({ conversationId: convRef.current, message: clean, mode: opts.mode ?? mode, retry: !!opts.retry }),
      });
      if (!res.ok || !res.body) {
        const err = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
        if (err.code === "consent") qc.invalidateQueries({ queryKey: ["buddy-prefs", uid] });
        if (err.code === "duplicate") return;
        if (err.code === "limit") {
          // Shown as the friendly "op voor vandaag" card below, with your text kept in the box.
          qc.invalidateQueries({ queryKey: ["buddy-status", uid] });
          if (!opts.retry) setText(clean);
          return;
        }
        setFailed({ message: clean, error: err.error ?? "Er ging iets mis. Probeer het nog eens.", retry: false, again: err.code !== "limit" && res.status !== 503 });
        if (!opts.retry) setText(clean);
        return;
      }
      const id = res.headers.get("X-Buddy-Conversation");
      if (id && !convRef.current) {
        // A new conversation: from now on this screen shows it.
        convRef.current = id;
        qc.setQueryData(["buddy-msgs", id], []);
        onConversation(id);
      }
      setSafety((res.headers.get("X-Buddy-Safety") as "none" | "zorg" | "acuut" | null) ?? "none");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setStream(acc);
      }
      if (acc.includes("[[fout]]") || !acc.trim())
        setFailed({ message: clean, error: "CeritaBuddy kon even niet antwoorden.", retry: true, again: true });
      await qc.invalidateQueries({ queryKey: ["buddy-msgs", convRef.current], refetchType: "all" });
    } catch {
      // Connection lost: the message may or may not have arrived, so retry asks the server to answer it.
      setFailed({ message: clean, error: "De verbinding viel weg.", retry: !!convRef.current, again: true });
    } finally {
      setPending(null);
      setStream(null);
      setBusy(false);
      qc.invalidateQueries({ queryKey: ["buddy-status", uid] });
      qc.invalidateQueries({ queryKey: ["buddy-convs", uid] });
    }
  }

  const shown: Msg[] = [...msgs];
  const lastAssistant = [...msgs].reverse().find((m) => m.role === "assistant");
  const lastParsed = lastAssistant && !busy ? parseReply(lastAssistant.content) : null;
  const lastIsAssistant = msgs.at(-1)?.role === "assistant";
  const anySafety = safety !== "none" || msgs.slice(-4).some((m) => m.safety);
  const remaining = status ? Math.max(0, status.daily_limit - status.used_today) : null;
  const stage = limitStage(remaining);
  const empty = !convId && !convRef.current && !pending && stream === null;

  return (
    <div className="flex flex-col gap-3">
      {empty && (
        <div className="space-y-3">
          <div className="flex items-center gap-1">
            <Riti size={96} expression="blij" />
            <div className="relative flex-1 rounded-2xl bg-card p-3 text-sm shadow-soft">
              <p className="font-semibold">Hoi! Waar wil je het over hebben?</p>
              <p className="mt-1 text-xs text-muted-foreground">Kies iets hieronder, of typ gewoon wat er in je opkomt.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {BUDDY_MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setMode(m.id);
                  void send(m.starter, { mode: m.id });
                }}
                className="flex items-center gap-2 rounded-2xl bg-card p-3 text-left text-xs font-semibold shadow-soft transition-transform active:scale-95"
              >
                <span className="text-xl">{m.emoji}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {convId && isLoading && <p className="text-sm text-muted-foreground">Gesprek laden…</p>}

      {shown.map((m) => (
        <Fragment key={m.id}>
          <Bubble role={m.role} text={m.role === "assistant" ? parseReply(m.content).text : m.content} />
          {m.role === "assistant" &&
            parseReply(m.content).links.length > 0 &&
            m.id !== lastAssistant?.id && <LinkRow links={parseReply(m.content).links} />}
        </Fragment>
      ))}
      {pending && <Bubble role="user" text={pending} />}
      {stream !== null &&
        (visibleWhileStreaming(stream).trim() ? (
          <Bubble role="assistant" text={visibleWhileStreaming(stream).replace("[[fout]]", "")} />
        ) : (
          <Typing />
        ))}

      {anySafety && !busy && <SafetyCard acute={safety === "acuut"} young={young} />}

      {lastParsed && lastIsAssistant && !failed && (
        <>
          {lastParsed.links.length > 0 && <LinkRow links={lastParsed.links} />}
          {lastParsed.choices.length > 0 && (
            <div className="flex flex-wrap justify-end gap-2">
              {lastParsed.choices.map((c) => (
                <button
                  key={c}
                  onClick={() => void send(c)}
                  className="rounded-full border-2 border-primary bg-card px-3 py-1.5 text-sm font-semibold text-foreground transition-transform active:scale-95"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {failed && (
        <div className="rounded-2xl bg-destructive/10 p-3 text-sm">
          <p>{failed.error}</p>
          {failed.again && (
            <Button size="sm" variant="outline" className="mt-2 rounded-full" onClick={() => void send(failed.message, { retry: failed.retry })}>
              Probeer opnieuw
            </Button>
          )}
        </div>
      )}

      <div ref={bottom} />

      <form
        className="sticky bottom-[calc(6.5rem+env(safe-area-inset-bottom,0px))] z-10 rounded-3xl bg-card p-2 shadow-soft"
        onSubmit={(e) => {
          e.preventDefault();
          void send(text);
        }}
      >
        {stage !== "ok" && !busy && <LimitCard left={remaining ?? 0} groups={groups} />}
        <div className="flex items-end gap-2">
          <textarea
            id="buddy-bericht"
            rows={1}
            value={text}
            maxLength={BUDDY_MAX_MESSAGE}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(text);
              }
            }}
            placeholder={empty ? "Typ gewoon wat er in je opkomt…" : "Typ een bericht…"}
            className="max-h-32 min-h-10 min-w-0 flex-1 resize-none rounded-2xl border border-input bg-background px-3 py-2 text-sm [field-sizing:content]"
          />
          <Button type="submit" size="icon" disabled={busy || !text.trim() || stage === "op"} aria-label="Versturen" className="shrink-0 rounded-full">
            <Send className="size-4" />
          </Button>
        </div>
        {remaining !== null && remaining <= 10 && stage === "ok" && (
          <p className="px-2 pt-1 text-[11px] text-muted-foreground">
            {remaining > 0 ? `Nog ${remaining} ${remaining === 1 ? "bericht" : "berichten"} vandaag` : "Op voor vandaag · om 00:00 kun je weer"}
          </p>
        )}
      </form>
    </div>
  );
}

/** Plain text with line breaks; **bold** is allowed. */
function Bubble({ role, text }: { role: "user" | "assistant"; text: string }) {
  const mine = role === "user";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-1`}>
      <div className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm shadow-soft ${mine ? "bg-accent" : "bg-card"}`}>
        {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
          part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
        )}
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex justify-start" aria-live="polite" aria-label="CeritaBuddy is aan het typen">
      <div className="flex gap-1 rounded-2xl bg-card px-4 py-3 shadow-soft">
        {[0, 150, 300].map((d) => (
          <span key={d} className="size-2 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
    </div>
  );
}

function LinkRow({ links }: { links: (keyof typeof BUDDY_LINKS)[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((k) => (
        <Link key={k} to={BUDDY_LINKS[k].to} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground">
          {BUDDY_LINKS[k].emoji} {BUDDY_LINKS[k].label} →
        </Link>
      ))}
    </div>
  );
}

/** The last few messages of the day, or none left: a warm pointer to real people. */
function LimitCard({ left, groups }: { left: number; groups: boolean }) {
  const op = left <= 0;
  return (
    <div className="mb-2 space-y-1.5 rounded-2xl bg-secondary p-3 text-xs text-secondary-foreground">
      <p className="font-semibold">
        {op ? "Je berichten voor vandaag zijn op 🌙" : `Nog ${left} ${left === 1 ? "bericht" : "berichten"} vandaag`}
      </p>
      <p>
        {op
          ? "Om 00:00 kun je weer verder met CeritaBuddy. Wil je nu nog praten? Dat kan met echte mensen:"
          : "Fijn dat je praat! Weet je dat je ook terecht kunt bij echte mensen?"}
      </p>
      <div className="flex flex-wrap gap-2">
        {groups && (
          <Link to="/community" className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-foreground">
            👥 Naar de groepen
          </Link>
        )}
        <Link to="/vragen" className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-foreground">
          🎓 Praat met een coach
        </Link>
        {op && (
          <Link to="/hulp" className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-foreground">
            🆘 Hulp nodig?
          </Link>
        )}
      </div>
    </div>
  );
}

/** Shown when the safety layer (or the AI itself) noticed something serious. */
function SafetyCard({ acute, young }: { acute: boolean; young: boolean }) {
  return (
    <div className="space-y-2 rounded-3xl border-2 border-primary bg-card p-4 text-sm shadow-soft">
      <p className="font-semibold">Je hoeft dit niet alleen te dragen 💗</p>
      {acute && (
        <p className="rounded-2xl bg-destructive/10 p-3 font-semibold">
          Ben je nu in gevaar? Bel <span className="select-all">112</span>, of vraag iemand in de buurt om te helpen.
        </p>
      )}
      <ul className="space-y-1">
        <li>📞 <b>113 Zelfmoordpreventie</b>: bel 113 of gratis 0800-0113, of chat op 113.nl</li>
        {young && <li>🧒 <b>Kindertelefoon</b>: gratis 0800-0432 (tot 18 jaar)</li>}
        <li>🏠 <b>Veilig Thuis</b>: gratis 0800-2000, bij geweld of misbruik thuis</li>
      </ul>
      <p className="text-xs text-muted-foreground">Praat ook met iemand die je vertrouwt, zoals een ouder, mentor of de huisarts.</p>
      <Link to="/hulp" className="inline-block rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Alle hulp bekijken</Link>
    </div>
  );
}
