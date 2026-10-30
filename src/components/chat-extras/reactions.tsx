import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { REACTIONS, byMessage, summarize, type Reaction } from "@/lib/reactions";

type Scope = { kind: "post" | "dm"; ids: string[]; channel: string };

/** All reactions on the messages in view, kept live. */
export function useReactions({ kind, ids, channel }: Scope) {
  const qc = useQueryClient();
  const col = kind === "post" ? "post_id" : "message_id";
  const recent = ids.slice(-200);
  const key = ["reactions", kind, channel, recent.length, recent[recent.length - 1]];
  const query = useQuery({
    queryKey: key,
    enabled: recent.length > 0,
    queryFn: async () =>
      ((
        await supabase
          .from("message_reactions")
          .select("emoji, user_id, post_id, message_id")
          .in(col, recent)
      ).data ?? []) as Reaction[],
  });
  useEffect(() => {
    const ch = supabase
      .channel(`reactions-${channel}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () =>
        qc.invalidateQueries({ queryKey: ["reactions", kind, channel] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [kind, channel, qc]);
  const map = byMessage(query.data ?? []);
  async function react(id: string, emoji: string, uid: string) {
    const current = summarize(map.get(id) ?? [], uid).mine;
    await supabase.from("message_reactions").delete().eq(col, id).eq("user_id", uid);
    if (current !== emoji) {
      const { error } = await supabase
        .from("message_reactions")
        .insert({ [col]: id, user_id: uid, emoji } as { emoji: string; user_id: string });
      if (error) toast.error("Reageren lukte niet.");
    }
    qc.invalidateQueries({ queryKey: ["reactions", kind, channel] });
  }
  return { map, react };
}

/**
 * Hold a message for half a second (or tap the small smiley) to pick an emoji, like iMessage.
 * The reactions show as small chips under the message.
 */
export function Reactable({
  reactions,
  uid,
  onReact,
  enabled,
  mine,
  className = "",
  children,
}: {
  reactions: Reaction[];
  uid: string | undefined;
  onReact: (emoji: string) => void;
  enabled: boolean;
  mine: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const { list, mine: myEmoji } = summarize(reactions, uid);

  const cancel = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => cancel, []);

  return (
    <div className={`relative flex flex-col ${mine ? "items-end" : "items-start"} ${className}`}>
      <div
        onPointerDown={(e) => {
          if (!enabled) return;
          start.current = { x: e.clientX, y: e.clientY };
          cancel();
          timer.current = window.setTimeout(() => {
            setOpen(true);
            navigator.vibrate?.(15);
          }, 450);
        }}
        onPointerMove={(e) => {
          if (
            start.current &&
            Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10
          )
            cancel();
        }}
        onPointerUp={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => enabled && e.preventDefault()}
        className="max-w-full select-none [-webkit-touch-callout:none]"
      >
        {children}
      </div>
      {open && (
        <>
          <button
            aria-label="Sluiten"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            className={`absolute -top-12 z-40 flex gap-1 rounded-full bg-card p-1.5 shadow-soft animate-in zoom-in-90 ${mine ? "right-0" : "left-0"}`}
          >
            {REACTIONS.map((e) => (
              <button
                key={e}
                aria-label={`Reageer met ${e}`}
                onClick={() => {
                  setOpen(false);
                  onReact(e);
                }}
                className={`grid size-9 place-items-center rounded-full text-xl active:scale-90 ${myEmoji === e ? "bg-primary/20" : ""}`}
              >
                {e}
              </button>
            ))}
          </div>
        </>
      )}
      {list.length > 0 && (
        <button
          onClick={() => enabled && setOpen(true)}
          className="-mt-2 flex items-center gap-0.5 rounded-full border border-border bg-card px-1.5 py-0.5 text-xs shadow-soft"
          aria-label="Reacties"
        >
          {list.map((r) => (
            <span key={r.emoji} className={r.emoji === myEmoji ? "font-bold" : ""}>
              {r.emoji}
              {r.count > 1 && <span className="ml-0.5 text-[10px]">{r.count}</span>}
            </span>
          ))}
        </button>
      )}
    </div>
  );
}
