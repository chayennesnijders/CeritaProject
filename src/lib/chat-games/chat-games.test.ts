import { describe, expect, it } from "vitest";
import { c4Move, c4Start } from "./connect4";
import { ludoMovable, ludoMove, ludoRoll, ludoStart } from "./ludo";
import { dartAim, dartScore, dartsMove, dartsStart } from "./darts";
import { CHAT_GAMES, chatGame, gameCardLine, gamePushText, playerIndex } from "./index";
import { poolMove, poolStart, simulate } from "./pool";
import { tttMove, tttStart } from "./tictactoe";

describe("boter, kaas en eieren", () => {
  it("finds three in a row and refuses taken squares", () => {
    let s = tttStart();
    for (const [p, sq] of [
      [0, 0],
      [1, 3],
      [0, 1],
      [1, 4],
    ] as const)
      s = tttMove(s, p, sq)!.state;
    expect(tttMove(s, 0, 3)).toBeNull();
    const r = tttMove(s, 0, 2)!;
    expect(r.finished).toBe(true);
    expect(r.winner).toBe(0);
  });
  it("ends in a draw when the board is full", () => {
    let s = tttStart();
    const moves = [0, 1, 2, 4, 3, 5, 7, 6, 8];
    let r;
    moves.forEach((sq, i) => {
      r = tttMove(s, (i % 2) as 0 | 1, sq)!;
      s = r.state;
    });
    expect(r!.finished).toBe(true);
    expect(r!.winner).toBeNull();
  });
});

describe("vier op een rij", () => {
  it("drops to the bottom and finds four vertically", () => {
    let s = c4Start();
    for (let i = 0; i < 3; i++) {
      s = c4Move(s, 0, 3)!.state;
      s = c4Move(s, 1, 4)!.state;
    }
    expect(s.board[5 * 7 + 3]).toBe(1);
    const r = c4Move(s, 0, 3)!;
    expect(r.winner).toBe(0);
  });
  it("refuses a full column", () => {
    let s = c4Start();
    for (let i = 0; i < 6; i++) s = c4Move(s, (i % 2) as 0 | 1, 0)!.state;
    expect(c4Move(s, 0, 0)).toBeNull();
  });
});

describe("darten", () => {
  it("scores the board like a real dartboard", () => {
    expect(dartScore(0, 0).score).toBe(50);
    expect(dartScore(0, -0.07).score).toBe(25);
    expect(dartScore(0, -0.5)).toEqual({ score: 20, label: "20" });
    expect(dartScore(0, -0.61).score).toBe(60);
    expect(dartScore(0, -0.98).score).toBe(40);
    expect(dartScore(0.5, 0).score).toBe(6);
    expect(dartScore(0, 0.5).score).toBe(3);
    expect(dartScore(0, 1.2).score).toBe(0);
  });
  it("plays three rounds each and picks the highest total", () => {
    let s = dartsStart();
    const bull = { x: 0, y: 0, score: 50, label: "" };
    const miss = { x: 2, y: 2, score: 0, label: "" };
    let r;
    for (let i = 0; i < 3; i++) {
      r = dartsMove(s, 0, [bull, miss, miss])!;
      s = r.state;
      expect(r.finished).toBe(false);
      r = dartsMove(s, 1, [miss, miss, miss])!;
      s = r.state;
    }
    expect(r!.finished).toBe(true);
    expect(r!.winner).toBe(0);
    expect(dartsMove(s, 0, [bull, bull, bull])).toBeNull();
  });
});

describe("darten richten", () => {
  it("lands in the middle when you pull straight back far enough", () => {
    const a = dartAim({ x: 0, y: 0.8 });
    expect(dartScore(a.x, a.y).score).toBe(50);
  });
  it("misses below the board without pulling, and aims the other way when pulling sideways", () => {
    expect(dartScore(dartAim({ x: 0, y: 0 }).x, dartAim({ x: 0, y: 0 }).y).score).toBe(0);
    expect(dartAim({ x: -0.3, y: 0.8 }).x).toBeGreaterThan(0);
  });
});

describe("pool", () => {
  it("is deterministic so the other player sees the same shot", () => {
    const s = poolStart();
    const a = simulate(s.balls, 0.02, 0.9);
    const b = simulate(s.balls, 0.02, 0.9);
    expect(a.balls).toEqual(b.balls);
    expect(a.frames.length).toBeGreaterThan(2);
  });
  it("keeps all balls on the table and stops them", () => {
    const { balls } = simulate(poolStart().balls, 0, 1);
    for (const x of balls.filter((b) => !b.potted)) {
      expect(x.x).toBeGreaterThan(0);
      expect(x.x).toBeLessThan(2);
      expect(x.y).toBeGreaterThan(0);
      expect(x.y).toBeLessThan(1);
    }
  });
  it("gives the turn away after a miss and puts a potted white ball back", () => {
    const s = poolStart();
    // Straight into the top-left pocket, away from the rack: nothing potted but the white ball.
    const r = poolMove(s, 0, Math.atan2(-0.5, -0.5), 1);
    expect(r.next).toBe("other");
    const cue = r.state.balls.find((b) => b.id === 0)!;
    expect(cue.potted).toBe(false);
    expect(r.state.scores).toEqual([0, 0]);
  });
});

describe("game list", () => {
  it("knows every game and nothing else", () => {
    expect(Object.keys(CHAT_GAMES)).toHaveLength(5);
    expect(chatGame("pool")?.name).toBe("Pool");
    expect(chatGame("schaak")).toBeNull();
  });
});

describe("push text", () => {
  it("tells the other player it is their turn or who won", () => {
    expect(
      gamePushText("pool", { name: "Sam", status: "bezig", youWon: false, draw: false }).title,
    ).toBe("🎱 Pool: jouw beurt!");
    expect(
      gamePushText("darten", { name: "Sam", status: "klaar", youWon: true, draw: false }).body,
    ).toContain("gewonnen van Sam");
    expect(
      gamePushText("darten", { name: "Sam", status: "klaar", youWon: false, draw: true }).body,
    ).toContain("Gelijkspel");
  });
});

describe("game card", () => {
  const base = {
    id: "g",
    game: "pool",
    group_id: "x",
    conversation_id: null,
    created_by: "a",
    players: ["a"],
    turn: null,
    moves: 0,
    state: {},
    status: "wacht",
    winner: null,
  };
  const nameOf = (id: string) => ({ a: "Anna", b: "Bo" })[id] ?? "Lid";
  it("knows who plays and whose turn it is", () => {
    expect(playerIndex({ players: ["a", "b"] }, "b")).toBe(1);
    expect(playerIndex({ players: ["a", "b"] }, "c")).toBeNull();
    expect(gameCardLine(base, "b", nameOf)).toBe("Anna zoekt een tegenstander!");
    expect(gameCardLine(base, "a", nameOf)).toContain("Wacht");
    const playing = { ...base, players: ["a", "b"], status: "bezig", turn: "b" };
    expect(gameCardLine(playing, "b", nameOf)).toBe("Jouw beurt!");
    expect(gameCardLine(playing, "a", nameOf)).toBe("Bo is aan de beurt");
    expect(
      gameCardLine({ ...playing, status: "klaar", turn: null, winner: "a" }, "a", nameOf),
    ).toContain("Jij hebt gewonnen");
    expect(gameCardLine({ ...base, status: "klaar" }, "a", nameOf)).toBe("Gestopt");
  });
});

describe("mens erger je niet", () => {
  it("needs a 6 to come out and then rolls again", () => {
    const s = ludoStart();
    expect(ludoMovable(s, 0, 4)).toEqual([]);
    const r = ludoMove(s, 0, 6, 0)!;
    expect(r.state.pos[0][0]).toBe(0);
    expect(r.next).toBe("same");
  });
  it("gives three tries for a 6 with nothing on the board", () => {
    let s = ludoStart();
    let r = ludoMove(s, 0, 3, null)!;
    expect(r.next).toBe("same");
    s = ludoMove(r.state, 0, 2, null)!.state;
    r = ludoMove(s, 0, 1, null)!;
    expect(r.next).toBe("other");
    expect(r.state.tries).toBe(0);
  });
  it("sends the other pawn home when you land on it", () => {
    const s: ReturnType<typeof ludoStart> = {
      pos: [
        [18, -1, -1, -1],
        [0, -1, -1, -1],
      ],
      tries: 0,
    };
    // Player 1's square 0 is track square 20; player 0 at 18 + 2 = 20.
    const r = ludoMove(s, 0, 2, 0)!;
    expect(r.state.pos[1][0]).toBe(-1);
    expect(r.next).toBe("other");
  });
  it("needs the exact number to finish and wins with all four in", () => {
    const s: ReturnType<typeof ludoStart> = {
      pos: [
        [41, 42, 43, 37],
        [-1, -1, -1, -1],
      ],
      tries: 0,
    };
    expect(ludoMovable(s, 0, 6)).toEqual([]);
    expect(ludoMovable(s, 0, 4)).toEqual([]); // 41 is taken by your own pawn
    const r = ludoMove(s, 0, 3, 3)!;
    expect(r.finished).toBe(true);
    expect(r.winner).toBe(0);
  });
  it("rolls the same die for the same turn", () => {
    expect(ludoRoll("g:3")).toBe(ludoRoll("g:3"));
    const rolls = new Set(Array.from({ length: 200 }, (_, i) => ludoRoll(`g:${i}`)));
    expect([...rolls].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
