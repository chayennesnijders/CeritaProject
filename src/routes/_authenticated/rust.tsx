import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Riti } from "@/components/Riti";
import { breathAt } from "@/lib/breathing";

export const Route = createFileRoute("/_authenticated/rust")({
  head: () => ({
    meta: [
      { title: "Rustmoment — CeritaProject" },
      { name: "description", content: "Even rustig ademen met Riti." },
    ],
  }),
  component: CalmPage,
});

const LENGTHS = [
  { rounds: 3, label: "Kort (½ min)" },
  { rounds: 5, label: "1 minuut" },
  { rounds: 10, label: "2 minuten" },
];

/** Breathe along with Riti: Riti grows when you breathe in and shrinks when you breathe out. */
function CalmPage() {
  const [rounds, setRounds] = useState<number | null>(null);
  const [t, setT] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    if (rounds === null) return;
    const t0 = performance.now();
    const tick = (now: number) => {
      setT((now - t0) / 1000);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [rounds]);

  const b = breathAt(t);
  const done = rounds !== null && b.round > rounds;
  useEffect(() => {
    if (done) cancelAnimationFrame(raf.current);
  }, [done]);

  return (
    <div className="flex min-h-[70dvh] flex-col items-center pt-4 text-center">
      <h1 className="text-3xl">🫧 Rustmoment</h1>
      {rounds === null ? (
        <>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Adem samen met Riti. Riti wordt groter als je inademt en kleiner als je uitademt. Ga
            lekker zitten.
          </p>
          <div className="my-6">
            <Riti size={180} expression="troostend" />
          </div>
          <p className="mb-3 text-sm font-semibold">Hoe lang wil je?</p>
          <div className="grid w-full max-w-xs gap-2">
            {LENGTHS.map((l) => (
              <Button
                key={l.rounds}
                onClick={() => setRounds(l.rounds)}
                className="h-12 rounded-full"
              >
                {l.label}
              </Button>
            ))}
          </div>
        </>
      ) : done ? (
        <>
          <div className="my-6">
            <Riti size={200} expression="blij" />
          </div>
          <p className="text-xl font-semibold">Goed gedaan 💛</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Hoe voel je je nu? Je kunt dit altijd opnieuw doen als je even rust nodig hebt.
          </p>
          <div className="mt-5 grid w-full max-w-xs gap-2">
            <Button
              onClick={() => {
                setT(0);
                setRounds(null);
              }}
              variant="outline"
              className="h-12 rounded-full"
            >
              Nog een keer
            </Button>
            <Link to="/hulp" className="text-sm text-primary underline">
              Wil je met iemand praten? Hier vind je hulp
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            Ronde {b.round} van {rounds}
          </p>
          <div className="relative my-8 grid size-72 place-items-center">
            {/* Soft pink circles that breathe with you; Riti sits in a white circle so the picture blends in. */}
            <div
              className="absolute inset-0 rounded-full bg-[#f7c6d0]/50"
              style={{ transform: `scale(${b.scale})` }}
            />
            <div
              className="absolute inset-6 rounded-full bg-[#f7c6d0]/70"
              style={{ transform: `scale(${b.scale})` }}
            />
            <div
              className="grid size-48 place-items-center overflow-hidden rounded-full bg-white"
              style={{ transform: `scale(${b.scale})` }}
            >
              <Riti size={150} expression="troostend" />
            </div>
          </div>
          <p className="text-2xl font-semibold">{b.phase.label}</p>
          <p className="mt-1 text-4xl font-bold text-primary">{b.left}</p>
          <button
            onClick={() => setRounds(null)}
            className="mt-8 text-sm text-muted-foreground underline"
          >
            Stoppen
          </button>
        </>
      )}
    </div>
  );
}
