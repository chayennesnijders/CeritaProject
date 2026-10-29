import { useEffect, useRef, useState } from "react";

/** Riti in 3D: drag to turn her around, tap to make her jump. Falls back to the 2D bear without WebGL. */
export function Riti3D({
  size = 180,
  wave = false,
  className = "",
}: {
  size?: number;
  wave?: boolean;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [hearts, setHearts] = useState<number[]>([]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let handle: { dispose: () => void } | null = null;
    let cancelled = false;
    const gl =
      document.createElement("canvas").getContext("webgl2") ??
      document.createElement("canvas").getContext("webgl");
    if (!gl) {
      setFailed(true);
      return;
    }
    import("@/lib/riti-scene")
      .then(({ mountRiti }) => {
        if (!cancelled) handle = mountRiti(el, { wave });
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      handle?.dispose();
    };
  }, [wave]);

  function popHeart() {
    const id = Date.now();
    setHearts((h) => [...h, id]);
    setTimeout(() => setHearts((h) => h.filter((x) => x !== id)), 1000);
  }

  if (failed)
    return (
      <img
        src="/cerita-beer.png"
        alt="Riti"
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  return (
    <div
      ref={box}
      role="img"
      aria-label="Riti, het beertje van CeritaProject"
      onPointerUp={popHeart}
      className={`relative shrink-0 cursor-grab select-none active:cursor-grabbing ${className}`}
      style={{ width: size, height: size }}
    >
      {hearts.map((id) => (
        <span
          key={id}
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/4 animate-[pet-float_1s_ease-out_forwards] text-2xl"
        >
          💕
        </span>
      ))}
    </div>
  );
}
