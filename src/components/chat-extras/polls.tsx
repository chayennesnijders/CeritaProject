import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { POLL_MAX_OPTIONS, pollFormError, tally } from "@/lib/polls";

/** Keeps the polls of a group live. */
export function usePollsLive(groupId: string) {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel(`polls-${groupId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_votes" }, () =>
        qc.invalidateQueries({ queryKey: ["poll"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [groupId, qc]);
}

/** A poll inside a group message: tap an answer to vote (tap again to change). */
export function PollCard({
  pollId,
  uid,
  canVote,
}: {
  pollId: string;
  uid: string | undefined;
  canVote: boolean;
}) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["poll", pollId],
    queryFn: async () => {
      const [p, v] = await Promise.all([
        supabase.from("polls").select("question, options").eq("id", pollId).maybeSingle(),
        supabase.from("poll_votes").select("user_id, option").eq("poll_id", pollId),
      ]);
      return p.data ? { ...p.data, votes: v.data ?? [] } : null;
    },
  });
  if (!data) return <p className="mt-1 text-xs italic text-muted-foreground">Peiling laden…</p>;
  const { total, percents } = tally(data.options.length, data.votes);
  const mine = data.votes.find((v) => v.user_id === uid)?.option ?? null;

  async function vote(option: number) {
    if (!uid || !canVote) return;
    await supabase.from("poll_votes").delete().eq("poll_id", pollId).eq("user_id", uid);
    if (mine !== option) {
      const { error } = await supabase
        .from("poll_votes")
        .insert({ poll_id: pollId, user_id: uid, option });
      if (error) toast.error("Stemmen lukte niet.");
    }
    qc.invalidateQueries({ queryKey: ["poll", pollId] });
  }

  return (
    <div className="mt-1 w-64 max-w-full space-y-1.5">
      <p className="text-sm font-semibold">📊 {data.question}</p>
      {data.options.map((o, i) => (
        <button
          key={i}
          onClick={() => vote(i)}
          disabled={!canVote}
          className={`relative block w-full overflow-hidden rounded-xl border px-3 py-2 text-left text-sm ${mine === i ? "border-primary" : "border-border"}`}
        >
          <span
            className="absolute inset-y-0 left-0 bg-primary/20 transition-all"
            style={{ width: `${mine !== null ? percents[i] : 0}%` }}
          />
          <span className="relative flex justify-between gap-2">
            <span>
              {mine === i ? "✓ " : ""}
              {o}
            </span>
            {mine !== null && <span className="font-semibold">{percents[i]}%</span>}
          </span>
        </button>
      ))}
      <p className="text-[11px] text-muted-foreground">
        {total} {total === 1 ? "stem" : "stemmen"}
        {mine === null ? " · stem om de uitslag te zien" : ""}
      </p>
    </div>
  );
}

/** 📊 button in a group chat: make a poll. */
export function PollComposer({
  groupId,
  onCreated,
  disabled,
}: {
  groupId: string;
  onCreated: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [busy, setBusy] = useState(false);
  const error = question || options.some((o) => o) ? pollFormError(question, options) : null;

  async function send() {
    setBusy(true);
    const { error: err } = await supabase.rpc("create_poll", {
      _group: groupId,
      _question: question.trim(),
      _options: options.map((o) => o.trim()).filter(Boolean),
    });
    setBusy(false);
    if (err) {
      toast.error(err.message);
      return;
    }
    setOpen(false);
    setQuestion("");
    setOptions(["", ""]);
    onCreated();
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-1.5 rounded-full bg-muted px-3 text-xs font-semibold disabled:opacity-50"
      >
        📊 Peiling
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] max-w-sm overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>📊 Maak een peiling</DialogTitle>
            <DialogDescription>Stel een vraag en laat de groep stemmen.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={question}
              maxLength={140}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Bijvoorbeeld: Welke film kijken we?"
              className="h-12 rounded-2xl"
            />
            {options.map((o, i) => (
              <Input
                key={i}
                value={o}
                maxLength={60}
                onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))}
                placeholder={`Antwoord ${i + 1}`}
                className="h-11 rounded-2xl"
              />
            ))}
            {options.length < POLL_MAX_OPTIONS && (
              <button
                onClick={() => setOptions([...options, ""])}
                className="text-sm text-primary underline"
              >
                + Nog een antwoord
              </button>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              disabled={busy || !!error || !question}
              onClick={send}
              className="h-12 w-full rounded-full"
            >
              {busy ? "Even geduld…" : "Peiling versturen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
