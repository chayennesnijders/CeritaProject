import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  chatGame,
  gameCardLine,
  playerIndex,
  type ChatGameId,
  type ChatGameRow,
} from "@/lib/chat-games";
import type { MoveResult } from "@/lib/chat-games/types";
import type { Json } from "@/integrations/supabase/types";
import { notifyGameMove } from "@/lib/push.functions";
import { useChatGame } from "@/lib/use-chat-games";
import { ConnectFourBoard } from "./ConnectFourBoard";
import { DartsBoard } from "./DartsBoard";
import { PoolTable } from "./PoolTable";
import { TicTacToeBoard } from "./TicTacToeBoard";

/** Full-screen game, opened from the game card in a chat. */
export function GameScreen({
  gameId,
  uid,
  nameOf,
  onClose,
  onRematch,
}: {
  gameId: string;
  uid: string | undefined;
  nameOf: (id: string) => string;
  onClose: () => void;
  /** Start a new game of the same kind in this chat. */
  onRematch?: (game: ChatGameId) => void;
}) {
  const qc = useQueryClient();
  const notify = useServerFn(notifyGameMove);
  const { data: game } = useChatGame(gameId);
  const [busy, setBusy] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const info = game ? chatGame(game.game) : null;
  const me = game ? playerIndex(game, uid) : null;
  const myTurn = !!game && game.status === "bezig" && game.turn === uid;
  const refresh = () => qc.invalidateQueries({ queryKey: ["chat-game", gameId] });

  async function move(r: MoveResult<unknown>) {
    if (!game) return;
    setBusy(true);
    const { error } = await supabase.rpc("chat_game_move", {
      _game: game.id,
      _moves: game.moves,
      _state: r.state as Json,
      _again: r.next === "same",
      _finished: r.finished,
      _winner: r.winner,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else notify({ data: { gameId: game.id } }).catch(() => {});
    if (r.finished && !error) navigator.vibrate?.([30, 60, 30]);
    refresh();
  }

  async function join() {
    setBusy(true);
    const { error } = await supabase.rpc("join_chat_game", { _game: gameId });
    setBusy(false);
    if (error) toast.error(error.message);
    else notify({ data: { gameId } }).catch(() => {});
    refresh();
  }

  async function stop() {
    setConfirmStop(false);
    const { error } = await supabase.rpc("stop_chat_game", { _game: gameId });
    if (error) toast.error(error.message);
    else notify({ data: { gameId } }).catch(() => {});
    refresh();
  }

  const board = game && renderBoard(game, { me, myTurn, busy, onMove: move });

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label={info?.name ?? "Spelletje"}
    >
      <div className="flex items-center gap-2 px-3 pb-2 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <button
          onClick={onClose}
          aria-label="Sluiten"
          className="rounded-full bg-card p-2 shadow-soft"
        >
          <X className="size-5" />
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-base font-semibold">
          {info ? `${info.emoji} ${info.name}` : "Spelletje"}
        </p>
        <div className="size-9" />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        {!game ? (
          <p className="pt-10 text-center text-sm text-muted-foreground">Spel laden…</p>
        ) : (
          <div className="mx-auto max-w-md space-y-4">
            <div className="flex items-center justify-center gap-2 text-sm">
              {game.players.map((p, i) => (
                <span
                  key={p}
                  className={`rounded-full px-3 py-1 font-semibold ${game.turn === p ? "bg-primary text-primary-foreground" : "bg-card shadow-soft"}`}
                >
                  {i === 0 ? "1️⃣" : "2️⃣"} {p === uid ? "Jij" : nameOf(p)}
                </span>
              ))}
            </div>
            <p
              className={`text-center text-lg font-semibold ${myTurn ? "animate-pulse text-primary" : ""}`}
            >
              {busy ? "Even geduld…" : gameCardLine(game, uid, nameOf)}
            </p>

            {game.status === "wacht" ? (
              <div className="space-y-3 rounded-3xl bg-card p-5 text-center shadow-soft">
                <p className="text-5xl">{info?.emoji}</p>
                <p className="text-sm text-muted-foreground">{info?.how}</p>
                {game.created_by !== uid && (
                  <Button disabled={busy} onClick={join} className="h-12 w-full rounded-full">
                    Doe mee!
                  </Button>
                )}
              </div>
            ) : (
              board
            )}

            {info && game.status !== "wacht" && (
              <p className="text-center text-xs text-muted-foreground">{info.how}</p>
            )}

            {game.status === "klaar" && me !== null && info && onRematch && (
              <Button
                className="h-12 w-full rounded-full"
                onClick={() => onRematch(game.game as ChatGameId)}
              >
                🔁 Nog een keer
              </Button>
            )}

            {game.status !== "klaar" && me !== null && (
              <div className="pt-2 text-center">
                {confirmStop ? (
                  <div className="rounded-2xl bg-card p-4 shadow-soft">
                    <p className="text-sm font-semibold">
                      {game.status === "wacht" ? "Spel stoppen?" : "Opgeven? Dan wint de ander."}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 rounded-full"
                        onClick={() => setConfirmStop(false)}
                      >
                        Nee, verder
                      </Button>
                      <Button className="flex-1 rounded-full" onClick={stop}>
                        Ja, stoppen
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmStop(true)}
                    className="text-xs text-muted-foreground underline"
                  >
                    {game.status === "wacht" ? "Spel stoppen" : "Opgeven"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function renderBoard(
  game: ChatGameRow,
  p: { me: 0 | 1 | null; myTurn: boolean; busy: boolean; onMove: (r: MoveResult<unknown>) => void },
) {
  const props = { ...p, state: game.state as never };
  switch (game.game) {
    case "pool":
      return <PoolTable key={game.moves} {...props} />;
    case "darten":
      return <DartsBoard {...props} />;
    case "vieropeenrij":
      return <ConnectFourBoard {...props} />;
    case "boterkaaseieren":
      return <TicTacToeBoard {...props} />;
    default:
      return <p className="text-center text-sm">Dit spel kent deze versie van de app nog niet.</p>;
  }
}
