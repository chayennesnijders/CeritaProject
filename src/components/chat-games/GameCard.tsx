import { chatGame, gameCardLine } from "@/lib/chat-games";
import { useChatGame } from "@/lib/use-chat-games";

/** The game as it shows in a chat bubble; tap to open the game. */
export function GameCard({
  gameId,
  uid,
  nameOf,
  onOpen,
}: {
  gameId: string;
  uid: string | undefined;
  nameOf: (id: string) => string;
  onOpen: () => void;
}) {
  const { data: game } = useChatGame(gameId);
  if (game === null) return <p className="text-xs italic opacity-70">Dit spel is er niet meer.</p>;
  const info = game ? chatGame(game.game) : null;
  const myTurn = game?.status === "bezig" && game.turn === uid;
  const canJoin = game?.status === "wacht" && game.created_by !== uid;
  const action = !game ? "…" : canJoin ? "Doe mee" : myTurn ? "Speel" : "Bekijk";
  return (
    <button
      onClick={onOpen}
      className="mt-1 flex w-60 max-w-full items-center gap-3 rounded-2xl bg-background p-3 text-left text-foreground shadow-soft active:scale-[0.98]"
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/15 text-3xl">
        {info?.emoji ?? "🎮"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{info?.name ?? "Spelletje"}</span>
        <span
          className={`block text-xs ${myTurn || canJoin ? "font-semibold text-primary" : "text-muted-foreground"}`}
        >
          {game ? gameCardLine(game, uid, nameOf) : "Laden…"}
        </span>
      </span>
      <span
        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${myTurn || canJoin ? "bg-primary text-primary-foreground" : "bg-muted"}`}
      >
        {action}
      </span>
    </button>
  );
}
