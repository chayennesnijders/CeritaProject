import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  GAME_XP,
  GAMES_WITH_XP_PER_DAY,
  PET_GAMES,
  bestScores,
  makeMemoryDeck,
  memoryScore,
  rewardMessage,
  type PetGameId,
} from "@/lib/pet-games";

/** Game menu + the three minigames. Finishing a game goes through finish_pet_game, which hands out the XP. */
export function PetGames({ uid, petEmoji }: { uid: string; petEmoji: string }) {
  const qc = useQueryClient();
  const [game, setGame] = useState<PetGameId | null>(null);
  const [result, setResult] = useState<{
    game: PetGameId;
    score: number;
    xp: number;
    best: boolean;
  } | null>(null);
  const { data: plays = [] } = useQuery({
    queryKey: ["pet-games", uid],
    queryFn: async () =>
      (await supabase.from("pet_games").select("game, score").eq("user_id", uid)).data ?? [],
  });
  const best = bestScores(plays);
  const box = useRef<HTMLDivElement>(null);
  // A started game scrolls into view, so the pet isn't hidden behind the bottom menu.
  useEffect(() => {
    if (game) box.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [game]);

  async function finish(id: PetGameId, score: number) {
    setGame(null);
    const { data: xp, error } = await supabase.rpc("finish_pet_game", { _game: id, _score: score });
    if (error) toast.error("Je score opslaan lukte niet.");
    setResult({ game: id, score, xp: xp ?? 0, best: score > (best[id] ?? 0) });
    qc.invalidateQueries({ queryKey: ["pet-games", uid] });
    qc.invalidateQueries({ queryKey: ["pet", uid] });
  }

  if (game)
    return (
      <div ref={box} className="scroll-mb-28">
        {game === "vangen" && <CatchGame petEmoji={petEmoji} onDone={(s) => finish("vangen", s)} />}
        {game === "memory" && (
          <MemoryGame petEmoji={petEmoji} onDone={(s) => finish("memory", s)} />
        )}
        {game === "ballonnen" && <BalloonGame onDone={(s) => finish("ballonnen", s)} />}
      </div>
    );

  return (
    <div className="space-y-2">
      {result && (
        <div className="rounded-2xl bg-accent p-4 text-center">
          <p className="text-3xl">{result.best ? "🏆" : "⭐"}</p>
          <p className="font-semibold">
            {result.best ? "Nieuw record!" : "Goed gespeeld!"} Score: {result.score}
          </p>
          <p className="text-xs">{rewardMessage(result.xp)}</p>
          <Button
            size="sm"
            className="mt-2 rounded-full"
            onClick={() => {
              setResult(null);
              setGame(result.game);
            }}
          >
            Nog een keer
          </Button>
        </div>
      )}
      {PET_GAMES.map((g) => (
        <button
          key={g.id}
          onClick={() => {
            setResult(null);
            setGame(g.id);
          }}
          className="flex w-full items-center gap-3 rounded-2xl bg-muted p-3 text-left"
        >
          <span className="text-3xl">{g.emoji}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{g.label}</span>
            <span className="block text-xs text-muted-foreground">{g.text}</span>
          </span>
          {best[g.id] !== undefined && (
            <span className="shrink-0 text-xs font-semibold">🏆 {best[g.id]}</span>
          )}
        </button>
      ))}
      <p className="text-center text-xs text-muted-foreground">
        De eerste {GAMES_WITH_XP_PER_DAY} spelletjes per dag geven je diertje +{GAME_XP} XP.
      </p>
    </div>
  );
}

function GameHeader({ score, seconds }: { score: number; seconds?: number }) {
  return (
    <div className="flex justify-between text-sm font-semibold">
      <span>⭐ {score}</span>
      {seconds !== undefined && <span>⏱️ {seconds}s</span>}
    </div>
  );
}

/** Counts down from `total` seconds and calls onEnd once at 0. */
function useCountdown(total: number, onEnd: () => void) {
  const [left, setLeft] = useState(total);
  const end = useRef(onEnd);
  end.current = onEnd;
  useEffect(() => {
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (left <= 0) end.current();
  }, [left]);
  return Math.max(0, left);
}

const TREATS = ["🍓", "🍪", "🦴", "🐟", "🧁", "🍎"];
type Treat = { id: number; x: number; y: number; emoji: string; speed: number };

/** Catch: drag (or tap the arrows) to move the pet; catch falling treats for 30 seconds. */
function CatchGame({ petEmoji, onDone }: { petEmoji: string; onDone: (score: number) => void }) {
  const area = useRef<HTMLDivElement>(null);
  const [petX, setPetX] = useState(50);
  const [treats, setTreats] = useState<Treat[]>([]);
  const [score, setScore] = useState(0);
  const state = useRef({
    petX: 50,
    treats: [] as Treat[],
    score: 0,
    nextId: 0,
    lastSpawn: 0,
    done: false,
  });
  const seconds = useCountdown(30, () => {
    if (state.current.done) return;
    state.current.done = true;
    onDone(state.current.score);
  });

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const s = state.current;
      const dt = Math.min(50, now - last) / 1000;
      last = now;
      const h = area.current?.clientHeight ?? 320;
      const spawnEvery = Math.max(350, 750 - s.score * 12);
      if (now - s.lastSpawn > spawnEvery) {
        s.lastSpawn = now;
        s.treats.push({
          id: s.nextId++,
          x: 8 + Math.random() * 84,
          y: -30,
          emoji: TREATS[Math.floor(Math.random() * TREATS.length)]!,
          speed: 120 + Math.random() * 80 + s.score * 3,
        });
      }
      const kept: Treat[] = [];
      for (const t of s.treats) {
        t.y += t.speed * dt;
        const atPet = t.y > h - 70 && t.y < h - 20 && Math.abs(t.x - s.petX) < 11;
        if (atPet) s.score++;
        else if (t.y < h) kept.push(t);
      }
      s.treats = kept;
      setTreats([...kept]);
      setScore(s.score);
      if (!s.done) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  function moveTo(clientX: number) {
    const r = area.current?.getBoundingClientRect();
    if (!r) return;
    const x = Math.min(94, Math.max(6, ((clientX - r.left) / r.width) * 100));
    state.current.petX = x;
    setPetX(x);
  }
  const nudge = (d: number) => {
    const x = Math.min(94, Math.max(6, state.current.petX + d));
    state.current.petX = x;
    setPetX(x);
  };

  return (
    <div className="space-y-2">
      <GameHeader score={score} seconds={seconds} />
      <div
        ref={area}
        onPointerDown={(e) => moveTo(e.clientX)}
        onPointerMove={(e) => (e.buttons || e.pointerType === "touch") && moveTo(e.clientX)}
        className="relative h-80 touch-none select-none overflow-hidden rounded-2xl bg-gradient-to-b from-sky-200 to-emerald-100"
      >
        {treats.map((t) => (
          <span
            key={t.id}
            className="pointer-events-none absolute text-2xl"
            style={{ left: `${t.x}%`, top: t.y, transform: "translateX(-50%)" }}
          >
            {t.emoji}
          </span>
        ))}
        <span
          className="pointer-events-none absolute bottom-2 text-5xl transition-[left] duration-75"
          style={{ left: `${petX}%`, transform: "translateX(-50%)" }}
        >
          {petEmoji}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => nudge(-12)}
          aria-label="Naar links"
        >
          ⬅️
        </Button>
        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => nudge(12)}
          aria-label="Naar rechts"
        >
          ➡️
        </Button>
      </div>
    </div>
  );
}

/** Memory: 6 pairs; the score depends on how many turns it took. */
function MemoryGame({ petEmoji, onDone }: { petEmoji: string; onDone: (score: number) => void }) {
  const [deck] = useState(() => makeMemoryDeck([petEmoji, "🍓", "🦴", "🎾", "🧶", "🌸"]));
  const [open, setOpen] = useState<number[]>([]);
  const [found, setFound] = useState<Set<number>>(new Set());
  const [turns, setTurns] = useState(0);
  const pairs = deck.length / 2;

  function flip(i: number) {
    if (open.length === 2 || open.includes(i) || found.has(i)) return;
    const next = [...open, i];
    setOpen(next);
    if (next.length < 2) return;
    setTurns((t) => t + 1);
    const [a, b] = next as [number, number];
    if (deck[a] === deck[b]) {
      const all = new Set(found).add(a).add(b);
      setFound(all);
      setOpen([]);
      if (all.size === deck.length) setTimeout(() => onDone(memoryScore(turns + 1, pairs)), 600);
    } else {
      setTimeout(() => setOpen([]), 800);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm font-semibold">
        <span>
          🔁 {turns} {turns === 1 ? "beurt" : "beurten"}
        </span>
        <span>
          ✅ {found.size / 2}/{pairs}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {deck.map((emoji, i) => {
          const shown = open.includes(i) || found.has(i);
          return (
            <button
              key={i}
              onClick={() => flip(i)}
              aria-label={shown ? emoji : "Kaartje omdraaien"}
              className={`flex aspect-square items-center justify-center rounded-2xl text-3xl transition-transform ${shown ? "bg-card shadow-soft" : "bg-primary text-primary-foreground active:scale-95"} ${found.has(i) ? "opacity-60" : ""}`}
            >
              {shown ? emoji : "?"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Balloons: tap balloons as they pop up in a 3×3 grid for 20 seconds; a gold star is worth 2. */
function BalloonGame({ onDone }: { onDone: (score: number) => void }) {
  const [active, setActive] = useState<{ cell: number; star: boolean; id: number } | null>(null);
  const [popped, setPopped] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const done = useRef(false);
  const seconds = useCountdown(20, () => {
    if (done.current) return;
    done.current = true;
    onDone(scoreRef.current);
  });

  useEffect(() => {
    let id = 0;
    let timer: ReturnType<typeof setTimeout>;
    const show = () => {
      setActive({ cell: Math.floor(Math.random() * 9), star: Math.random() < 0.15, id: id++ });
      timer = setTimeout(show, Math.max(450, 950 - scoreRef.current * 20));
    };
    show();
    return () => clearTimeout(timer);
  }, []);

  function tap(cell: number) {
    if (!active || active.cell !== cell) return;
    scoreRef.current += active.star ? 2 : 1;
    setScore(scoreRef.current);
    setPopped(cell);
    setActive(null);
    setTimeout(() => setPopped((p) => (p === cell ? null : p)), 250);
  }

  return (
    <div className="space-y-2">
      <GameHeader score={score} seconds={seconds} />
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }, (_, cell) => (
          <button
            key={cell}
            onPointerDown={() => tap(cell)}
            aria-label="Vakje"
            className="flex aspect-square select-none items-center justify-center rounded-2xl bg-muted text-4xl"
          >
            {popped === cell ? "💥" : active?.cell === cell ? (active.star ? "⭐" : "🎈") : ""}
          </button>
        ))}
      </div>
    </div>
  );
}
