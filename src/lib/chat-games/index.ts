import { c4Start } from "./connect4";
import { chessStart } from "./chess";
import { dartsStart } from "./darts";
import { damStart } from "./draughts";
import { ludoStart } from "./ludo";
import { poolStart } from "./pool";
import { tttStart } from "./tictactoe";

/** The games you can start in a group or private chat. */
export const CHAT_GAMES = {
  pool: {
    emoji: "🎱",
    name: "Pool",
    how: "Pot de meeste ballen. Raak je er een? Dan mag je nog een keer.",
    start: poolStart,
  },
  darten: {
    emoji: "🎯",
    name: "Darten",
    how: "Trek de pijl naar beneden, mik en laat los. 3 rondes van 3 pijlen: de meeste punten wint.",
    start: dartsStart,
  },
  vieropeenrij: {
    emoji: "🔴",
    name: "Vier op een rij",
    how: "Krijg als eerste vier op een rij: recht, schuin of omhoog.",
    start: c4Start,
  },
  mensergerjeniet: {
    emoji: "🎲",
    name: "Mens erger je niet",
    how: "Gooi 6 om een pion op het bord te zetten. Kom je op de ander? Die moet terug! Wie het eerst alle 4 pionnen binnen heeft, wint.",
    start: ludoStart,
  },
  schaken: {
    emoji: "♟️",
    name: "Schaken",
    how: "Tik op een stuk en dan op waar het heen moet. Zet de koning van de ander schaakmat om te winnen.",
    start: chessStart,
  },
  dammen: {
    emoji: "⚫",
    name: "Dammen",
    how: "Schuif schuin vooruit. Slaan is verplicht, ook achteruit, en je moet de meeste stukken slaan. Op de overkant word je een dam.",
    start: damStart,
  },
  boterkaaseieren: {
    emoji: "❌",
    name: "Boter, kaas en eieren",
    how: "Drie op een rij wint.",
    start: tttStart,
  },
} as const;
export type ChatGameId = keyof typeof CHAT_GAMES;
export const chatGame = (id: string) => CHAT_GAMES[id as ChatGameId] ?? null;

/** Push text for the other player after a move: their turn, or how the game ended. */
export function gamePushText(
  gameId: string,
  opts: { name: string; status: string; youWon: boolean; draw: boolean },
) {
  const g = chatGame(gameId);
  const label = g ? `${g.emoji} ${g.name}` : "🎮 Spelletje";
  if (opts.status === "klaar")
    return {
      title: label,
      body: opts.draw
        ? `Gelijkspel met ${opts.name}!`
        : opts.youWon
          ? `Je hebt gewonnen van ${opts.name}! 🏆`
          : `${opts.name} heeft gewonnen. Revanche?`,
    };
  return { title: `${label}: jouw beurt!`, body: `${opts.name} heeft gespeeld. Nu jij!` };
}

export type ChatGameRow = {
  id: string;
  game: string;
  group_id: string | null;
  conversation_id: string | null;
  created_by: string;
  players: string[];
  turn: string | null;
  moves: number;
  state: unknown;
  status: string;
  winner: string | null;
};

/** 0 for the first player, 1 for the second, null when you only watch. */
export function playerIndex(
  g: Pick<ChatGameRow, "players">,
  uid: string | undefined,
): 0 | 1 | null {
  const i = uid ? g.players.indexOf(uid) : -1;
  return i === 0 || i === 1 ? i : null;
}

/** The line on the game card in the chat. */
export function gameCardLine(
  g: ChatGameRow,
  uid: string | undefined,
  nameOf: (id: string) => string,
) {
  if (g.status === "wacht")
    return g.created_by === uid
      ? "Wacht op iemand die meedoet…"
      : `${nameOf(g.created_by)} zoekt een tegenstander!`;
  if (g.status === "klaar") {
    if (g.players.length < 2) return "Gestopt";
    if (!g.winner) return "Gelijkspel 🤝";
    return g.winner === uid ? "Jij hebt gewonnen! 🏆" : `${nameOf(g.winner)} heeft gewonnen 🏆`;
  }
  if (g.turn === uid) return "Jouw beurt!";
  return `${nameOf(g.turn ?? "")} is aan de beurt`;
}
