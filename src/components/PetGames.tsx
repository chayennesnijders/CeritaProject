import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  BREATH_MS,
  BREATH_ROUNDS,
  COLOURS,
  FEELING_ROUNDS,
  PET_GAMES,
  THOUGHTS,
  THOUGHT_ROUNDS,
  bestScores,
  breathPhase,
  feelingRound,
  makeMemoryDeck,
  memoryScore,
  oddRound,
  rewardMessage,
  shuffle,
  stroopRound,
  type PetGameId,
} from "@/lib/pet-games";

type Done = (score: number) => void;

/** Game menu: one new game per level. Finishing a game goes through finish_pet_game, which hands out the XP. */
export function PetGames({
  uid,
  petEmoji,
  level,
}: {
  uid: string;
  petEmoji: string;
  level: number;
}) {
  const qc = useQueryClient();
  const [game, setGame] = useState<PetGameId | null>(null);
  const [result, setResult] = useState<{
    game: PetGameId;
    score: number;
    xp: number;
    best: boolean;
  } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const { data: plays = [] } = useQuery({
    queryKey: ["pet-games", uid],
    queryFn: async () =>
      (await supabase.from("pet_games").select("game, score").eq("user_id", uid)).data ?? [],
  });
  const best = bestScores(plays);
  // A started game scrolls into view, so it isn't hidden behind the bottom menu.
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

  if (game) {
    const done: Done = (s) => finish(game, s);
    return (
      <div ref={box} className="scroll-mb-28">
        {game === "ademen" && <BreathGame petEmoji={petEmoji} onDone={done} />}
        {game === "memory" && <MemoryGame petEmoji={petEmoji} onDone={done} />}
        {game === "kleuren" && <StroopGame onDone={done} />}
        {game === "gevoelens" && <FeelingsGame onDone={done} />}
        {game === "lichtjes" && <LightsGame onDone={done} />}
        {game === "gedachten" && <ThoughtsGame onDone={done} />}
        {game === "zoeken" && <OddGame onDone={done} />}
        <button
          onClick={() => setGame(null)}
          className="mt-3 w-full text-center text-xs text-muted-foreground underline"
        >
          Stoppen
        </button>
      </div>
    );
  }

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
      {PET_GAMES.map((g) => {
        const open = level >= g.level;
        return (
          <button
            key={g.id}
            disabled={!open}
            onClick={() => {
              setResult(null);
              setGame(g.id);
            }}
            className={`flex w-full items-center gap-3 rounded-2xl bg-muted p-3 text-left ${open ? "" : "opacity-50"}`}
          >
            <span className="text-3xl">{open ? g.emoji : "🔒"}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{g.label}</span>
              <span className="block text-xs text-muted-foreground">
                {open ? g.text : `Komt vrij bij level ${g.level}`}
              </span>
            </span>
            {open && best[g.id] !== undefined && (
              <span className="shrink-0 text-xs font-semibold">🏆 {best[g.id]}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function GameHeader({ left, right }: { left: string; right?: string }) {
  return (
    <div className="mb-2 flex justify-between text-sm font-semibold">
      <span>{left}</span>
      {right && <span>{right}</span>}
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
    if (left === 0) end.current();
  }, [left]);
  return Math.max(0, left);
}

/** Rustig ademen: hold while the bubble grows (in), let go while it shrinks (out). Score = % of time in rhythm. */
function BreathGame({ petEmoji, onDone }: { petEmoji: string; onDone: Done }) {
  const total = BREATH_MS * 2 * BREATH_ROUNDS;
  const [phase, setPhase] = useState<"klaar" | "in" | "uit">("klaar");
  const [left, setLeft] = useState(total / 1000);
  const holding = useRef(false);
  const tally = useRef({ good: 0, all: 0 });
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const start = performance.now() + 1500; // a moment to get ready
    const t = setInterval(() => {
      const ms = performance.now() - start;
      if (ms < 0) return;
      if (ms >= total) {
        clearInterval(t);
        const { good, all } = tally.current;
        done.current(Math.round((good / Math.max(1, all)) * 100));
        return;
      }
      const p = breathPhase(ms);
      setPhase(p);
      setLeft(Math.ceil((total - ms) / 1000));
      tally.current.all++;
      if ((p === "in") === holding.current) tally.current.good++;
    }, 100);
    return () => clearInterval(t);
  }, [total]);
  const hold = (v: boolean) => () => {
    holding.current = v;
  };
  return (
    <div className="text-center">
      <GameHeader
        left={
          phase === "klaar" ? "Maak je klaar…" : phase === "in" ? "Adem in… 🌬️" : "Adem uit… 😮‍💨"
        }
        right={`⏱️ ${left}s`}
      />
      <div className="flex h-72 items-center justify-center rounded-2xl bg-gradient-to-b from-sky-100 to-violet-100">
        <button
          onPointerDown={hold(true)}
          onPointerUp={hold(false)}
          onPointerLeave={hold(false)}
          onPointerCancel={hold(false)}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="Houd vast tijdens inademen"
          className="flex size-56 touch-none select-none items-center justify-center rounded-full bg-sky-300/70 text-5xl shadow-[0_0_40px_rgba(125,211,252,.8)] ease-in-out"
          style={{
            transform: `scale(${phase === "in" ? 1 : 0.45})`,
            transitionProperty: "transform",
            transitionDuration: `${phase === "klaar" ? 600 : BREATH_MS}ms`,
          }}
        >
          {petEmoji}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Houd de bel vast als hij groeit, laat los als hij krimpt.
      </p>
    </div>
  );
}

/** Memory: 6 pairs; the score depends on how many turns it took. */
function MemoryGame({ petEmoji, onDone }: { petEmoji: string; onDone: Done }) {
  const [deck] = useState(() => makeMemoryDeck([petEmoji, "🧠", "💖", "🌈", "⭐", "🌸"]));
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
    <div>
      <GameHeader
        left={`🔁 ${turns} ${turns === 1 ? "beurt" : "beurten"}`}
        right={`✅ ${found.size / 2}/${pairs}`}
      />
      <div className="grid grid-cols-4 gap-2">
        {deck.map((emoji, i) => {
          const shown = open.includes(i) || found.has(i);
          return (
            <button
              key={i}
              onClick={() => flip(i)}
              aria-label={shown ? emoji : "Kaartje omdraaien"}
              className={`flex aspect-square items-center justify-center rounded-2xl text-3xl transition-all duration-300 ${shown ? "bg-card shadow-soft" : "bg-primary text-primary-foreground active:scale-95"} ${found.has(i) ? "opacity-60" : ""}`}
            >
              {shown ? emoji : "?"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Kleur of woord? (Stroop): tap the ink colour, not the word. 30 seconds. */
function StroopGame({ onDone }: { onDone: Done }) {
  const [round, setRound] = useState(() => stroopRound());
  const [score, setScore] = useState(0);
  const [turn, setTurn] = useState(0);
  const [flash, setFlash] = useState<"goed" | "fout" | null>(null);
  const scoreRef = useRef(0);
  const seconds = useCountdown(30, () => onDone(scoreRef.current));
  function answer(id: string) {
    const ok = id === round.ink;
    if (ok) {
      scoreRef.current++;
      setScore(scoreRef.current);
    }
    setFlash(ok ? "goed" : "fout");
    setTimeout(() => setFlash(null), 250);
    setRound(stroopRound());
    setTurn((t) => t + 1);
  }
  return (
    <div>
      <GameHeader left={`⭐ ${score}`} right={`⏱️ ${seconds}s`} />
      <div
        className={`flex h-40 items-center justify-center rounded-2xl transition-colors duration-200 ${flash === "goed" ? "bg-emerald-100" : flash === "fout" ? "bg-rose-100" : "bg-muted"}`}
      >
        <span
          key={turn}
          className="animate-in zoom-in-75 text-5xl font-black tracking-wide duration-200"
          style={{ color: round.css }}
        >
          {round.word}
        </span>
      </div>
      <p className="my-2 text-center text-xs text-muted-foreground">
        In welke kleur staat het woord?
      </p>
      <div className="grid grid-cols-2 gap-2">
        {COLOURS.map((c) => (
          <button
            key={c.id}
            onClick={() => answer(c.id)}
            className="h-14 rounded-2xl text-sm font-bold text-white shadow-soft active:scale-95"
            style={{ background: c.css }}
          >
            {c.id}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Gevoelens raden: pick the feeling that goes with the face; a kind tip follows every answer. */
function FeelingsGame({ onDone }: { onDone: Done }) {
  const [n, setN] = useState(0);
  const [round, setRound] = useState(() => feelingRound());
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  function choose(name: string) {
    if (picked) return;
    setPicked(name);
    if (name === round.answer.name) setScore((s) => s + 10);
  }
  function next() {
    if (n + 1 >= FEELING_ROUNDS) {
      onDone(score);
      return;
    }
    setN(n + 1);
    setPicked(null);
    setRound(feelingRound());
  }
  return (
    <div>
      <GameHeader left={`⭐ ${score}`} right={`${n + 1}/${FEELING_ROUNDS}`} />
      <div className="flex h-36 items-center justify-center rounded-2xl bg-muted">
        <span key={n} className="animate-in zoom-in-50 text-7xl duration-300">
          {round.answer.face}
        </span>
      </div>
      <div className="mt-3 grid gap-2">
        {round.options.map((o) => {
          const right = picked && o === round.answer.name;
          const wrong = picked === o && o !== round.answer.name;
          return (
            <button
              key={o}
              onClick={() => choose(o)}
              className={`h-12 rounded-2xl text-sm font-semibold transition-colors ${right ? "bg-emerald-200" : wrong ? "bg-rose-200" : "bg-card shadow-soft"}`}
            >
              {o}
            </button>
          );
        })}
      </div>
      {picked && (
        <div className="mt-3 animate-in fade-in rounded-2xl bg-accent p-3 text-center text-sm duration-300">
          <p className="font-semibold">
            {picked === round.answer.name
              ? "Goed zo! 🎉"
              : `Dit is ${round.answer.name.toLowerCase()}.`}
          </p>
          <p className="text-xs">{round.answer.tip}</p>
          <Button size="sm" className="mt-2 rounded-full" onClick={next}>
            {n + 1 >= FEELING_ROUNDS ? "Klaar" : "Volgende"}
          </Button>
        </div>
      )}
    </div>
  );
}

const PADS = [
  { emoji: "💗", on: "bg-pink-400", off: "bg-pink-200" },
  { emoji: "💙", on: "bg-sky-400", off: "bg-sky-200" },
  { emoji: "💚", on: "bg-emerald-400", off: "bg-emerald-200" },
  { emoji: "💛", on: "bg-amber-300", off: "bg-amber-100" },
];

/** Volg de lichtjes: watch the sequence, then tap it back. It grows by one each round. Score = longest sequence. */
function LightsGame({ onDone }: { onDone: Done }) {
  const [seq, setSeq] = useState<number[]>(() => [Math.floor(Math.random() * 4)]);
  const [lit, setLit] = useState<number | null>(null);
  const [showing, setShowing] = useState(true);
  const [pos, setPos] = useState(0);
  useEffect(() => {
    setShowing(true);
    const timers: ReturnType<typeof setTimeout>[] = [];
    seq.forEach((pad, i) => {
      timers.push(setTimeout(() => setLit(pad), 700 + i * 650));
      timers.push(setTimeout(() => setLit(null), 700 + i * 650 + 420));
    });
    timers.push(
      setTimeout(
        () => {
          setShowing(false);
          setPos(0);
        },
        700 + seq.length * 650,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [seq]);

  function tap(pad: number) {
    if (showing) return;
    setLit(pad);
    setTimeout(() => setLit(null), 180);
    if (pad !== seq[pos]) {
      onDone(seq.length - 1);
      return;
    }
    if (pos + 1 === seq.length) {
      if (seq.length >= 20) {
        onDone(20);
        return;
      }
      setShowing(true);
      setTimeout(() => setSeq([...seq, Math.floor(Math.random() * 4)]), 400);
    } else setPos(pos + 1);
  }
  return (
    <div>
      <GameHeader
        left={`✨ Lengte ${seq.length}`}
        right={showing ? "Kijk goed… 👀" : "Jij bent! 👆"}
      />
      <div className="grid grid-cols-2 gap-3">
        {PADS.map((p, i) => (
          <button
            key={i}
            onClick={() => tap(i)}
            aria-label={`Lichtje ${i + 1}`}
            className={`flex aspect-square items-center justify-center rounded-3xl text-5xl transition-all duration-150 ${lit === i ? `${p.on} scale-105 shadow-[0_0_30px_rgba(255,255,255,.9)]` : p.off}`}
          >
            {p.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Gedachten sorteren: keep helpful thoughts, let unhelpful ones go and read a kinder way to see them. */
function ThoughtsGame({ onDone }: { onDone: Done }) {
  const [list] = useState(() => shuffle(THOUGHTS).slice(0, THOUGHT_ROUNDS));
  const [n, setN] = useState(0);
  const [picked, setPicked] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const t = list[n]!;
  function choose(keep: boolean) {
    if (picked !== null) return;
    setPicked(keep);
    if (keep === t.keep) setScore((s) => s + 10);
  }
  function next() {
    if (n + 1 >= list.length) {
      onDone(score);
      return;
    }
    setN(n + 1);
    setPicked(null);
  }
  return (
    <div>
      <GameHeader left={`⭐ ${score}`} right={`${n + 1}/${list.length}`} />
      <div
        key={n}
        className="flex min-h-36 animate-in fade-in slide-in-from-right-8 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-100 to-pink-100 p-5 text-center duration-300"
      >
        <p className="font-display text-xl leading-snug text-foreground">💭 "{t.text}"</p>
      </div>
      {picked === null ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => choose(true)}
            className="h-14 rounded-2xl bg-emerald-200 text-sm font-bold active:scale-95"
          >
            💚 Houden
          </button>
          <button
            onClick={() => choose(false)}
            className="h-14 rounded-2xl bg-sky-200 text-sm font-bold active:scale-95"
          >
            🎈 Loslaten
          </button>
        </div>
      ) : (
        <div className="mt-3 animate-in fade-in rounded-2xl bg-accent p-3 text-center text-sm duration-300">
          <p className="font-semibold">
            {picked === t.keep
              ? "Goed zo! 🎉"
              : t.keep
                ? "Deze mag je houden! 💚"
                : "Deze mag je loslaten 🎈"}
          </p>
          <p className="text-xs">
            {t.keep
              ? "Dit is een fijne gedachte. Zeg hem vaker tegen jezelf."
              : `Probeer eens: "${t.kinder}"`}
          </p>
          <Button size="sm" className="mt-2 rounded-full" onClick={next}>
            {n + 1 >= list.length ? "Klaar" : "Volgende"}
          </Button>
        </div>
      )}
    </div>
  );
}

/** Zoek de andere: find the one look-alike that's different; the grid grows. 30 seconds. */
function OddGame({ onDone }: { onDone: Done }) {
  const [found, setFound] = useState(0);
  const foundRef = useRef(0);
  const [round, setRound] = useState(() => oddRound(0));
  const [miss, setMiss] = useState<number | null>(null);
  const seconds = useCountdown(30, () => onDone(foundRef.current));
  function tap(i: number) {
    if (i !== round.oddIndex) {
      setMiss(i);
      setTimeout(() => setMiss(null), 300);
      return;
    }
    foundRef.current++;
    setFound(foundRef.current);
    setRound(oddRound(foundRef.current));
  }
  return (
    <div>
      <GameHeader left={`🔍 ${found} gevonden`} right={`⏱️ ${seconds}s`} />
      <div
        key={found}
        className="grid animate-in zoom-in-95 gap-1.5 duration-200"
        style={{ gridTemplateColumns: `repeat(${round.size}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: round.size * round.size }, (_, i) => (
          <button
            key={i}
            onClick={() => tap(i)}
            aria-label={`Plaatje ${i + 1}`}
            className={`flex aspect-square items-center justify-center rounded-xl ${round.size >= 5 ? "text-2xl" : "text-3xl"} ${miss === i ? "bg-rose-200" : "bg-muted"}`}
          >
            {i === round.oddIndex ? round.odd : round.same}
          </button>
        ))}
      </div>
    </div>
  );
}
