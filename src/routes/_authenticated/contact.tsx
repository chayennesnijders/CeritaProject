import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Riti } from "@/components/Riti";
import { useMyAdminMessages } from "@/lib/use-admin-messages";
import { MESSAGE_STATUS, MESSAGE_TOPICS, topicInfo, type MessageTopic } from "@/lib/admin-messages";

export const Route = createFileRoute("/_authenticated/contact")({
  head: () => ({
    meta: [
      { title: "Bericht aan de beheerders — CeritaProject" },
      {
        name: "description",
        content: "Stuur de beheerders van CeritaProject een vraag, idee of bericht.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { data: me } = useMe();
  const uid = me?.user.id;
  const qc = useQueryClient();
  const { data: mine = [] } = useMyAdminMessages(uid);
  const [topic, setTopic] = useState<MessageTopic>("vraag");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  // Opening this page means you have seen the answers.
  const unseen = mine.some((m) => m.reply && !m.reply_seen);
  useEffect(() => {
    if (!unseen) return;
    supabase
      .rpc("mark_admin_replies_seen")
      .then(() => qc.invalidateQueries({ queryKey: ["my-admin-messages", uid] }));
  }, [unseen, uid, qc]);

  async function send() {
    if (!uid || body.trim().length < 2) return;
    setBusy(true);
    const { error } = await supabase
      .from("admin_messages")
      .insert({ user_id: uid, topic, body: body.trim() });
    setBusy(false);
    if (error) {
      toast.error("Versturen lukte niet. Probeer het opnieuw.");
      return;
    }
    toast.success("Verstuurd! De beheerders lezen je bericht 💌");
    setBody("");
    qc.invalidateQueries({ queryKey: ["my-admin-messages", uid] });
  }

  return (
    <div className="space-y-5 pt-2">
      <Link to="/home" className="text-sm text-primary underline">
        Terug naar Home
      </Link>
      <h1 className="text-3xl">Bericht aan de beheerders</h1>

      <div className="flex items-center gap-2">
        <Riti size={110} expression="blij" />
        <div className="relative flex-1 rounded-2xl bg-card p-3 text-sm shadow-soft">
          <span
            aria-hidden
            className="absolute -left-1.5 top-1/2 size-3 -translate-y-1/2 rotate-45 bg-card"
          />
          Heb je een vraag, een idee, werkt er iets niet, of wil je gewoon iets kwijt? Schrijf het
          hier. Alleen de beheerders lezen je bericht, en alleen jij ziet hun antwoord. 💛
        </div>
      </div>

      <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
        <p className="text-sm font-semibold">Waar gaat het over?</p>
        <div className="grid grid-cols-2 gap-2">
          {MESSAGE_TOPICS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTopic(t.id)}
              className={`rounded-2xl p-3 text-left text-sm font-semibold transition active:scale-95 ${topic === t.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              <span className="mr-1">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={6}
          placeholder="Schrijf hier je bericht…"
          className="rounded-2xl"
        />
        <Button
          disabled={busy || body.trim().length < 2}
          onClick={send}
          className="h-12 w-full rounded-full"
        >
          {busy ? "Versturen…" : "💌 Versturen"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Gaat het echt niet goed met je en heb je nu meteen hulp nodig? Bel of chat gratis met de
          Kindertelefoon (0800-0432) of 113 (0800-0113). De beheerders lezen berichten niet altijd
          meteen.
        </p>
      </section>

      {mine.length > 0 && (
        <section className="space-y-3 pb-4">
          <h2 className="text-xl">Jouw berichten</h2>
          {mine.map((m) => {
            const t = topicInfo(m.topic);
            const st = MESSAGE_STATUS[m.status] ?? MESSAGE_STATUS["nieuw"]!;
            return (
              <div key={m.id} className="space-y-2 rounded-3xl bg-card p-4 shadow-soft">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-muted-foreground">
                    {t.emoji} {t.label} · {new Date(m.created_at).toLocaleDateString("nl-NL")}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${st.cls}`}>
                    {m.status === "nieuw" ? "Verstuurd" : st.label}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                {m.reply && (
                  <div className="rounded-2xl bg-secondary p-3 text-sm text-secondary-foreground">
                    <p className="text-xs font-semibold">🛡️ Antwoord van de beheerders</p>
                    <p className="mt-1 whitespace-pre-wrap">{m.reply}</p>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
