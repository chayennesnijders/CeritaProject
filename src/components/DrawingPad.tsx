import { useEffect, useRef, useState } from "react";
import { Eraser, Trash2, Undo2, X } from "lucide-react";
import { BRUSH_SIZES, DRAW_COLORS, pushUndo } from "@/lib/drawing";
import { Button } from "@/components/ui/button";

/**
 * Full-screen drawing for the diary. "Klaar" hands back a PNG file; `start` is an earlier drawing to continue.
 */
export function DrawingPad({
  open,
  title,
  start,
  onDone,
  onClose,
}: {
  open: boolean;
  title?: string | undefined;
  start?: File | null | undefined;
  onDone: (file: File) => void;
  onClose: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState<string>(DRAW_COLORS[0]);
  const [size, setSize] = useState<number>(BRUSH_SIZES[1].px);
  const [eraser, setEraser] = useState(false);
  const [undo, setUndo] = useState<ImageData[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);

  // Size the canvas to the screen (sharp on retina), white background, and the earlier drawing if any.
  useEffect(() => {
    if (!open) return;
    const c = canvas.current!;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const { width, height } = c.getBoundingClientRect();
    c.width = Math.round(width * ratio);
    c.height = Math.round(height * ratio);
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    setUndo([]);
    if (start) {
      const url = URL.createObjectURL(start);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(width / img.width, height / img.height);
        ctx.drawImage(
          img,
          (width - img.width * scale) / 2,
          (height - img.height * scale) / 2,
          img.width * scale,
          img.height * scale,
        );
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, start]);

  if (!open) return null;

  const ctx = () => canvas.current!.getContext("2d")!;
  const point = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const snapshot = () => {
    const c = canvas.current!;
    setUndo((s) => pushUndo(s, c.getContext("2d")!.getImageData(0, 0, c.width, c.height)));
  };
  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    snapshot();
    last.current = point(e);
    dot(last.current);
  }
  function dot(p: { x: number; y: number }) {
    const g = ctx();
    g.fillStyle = eraser ? "#ffffff" : color;
    g.beginPath();
    g.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
    g.fill();
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!last.current) return;
    const p = point(e);
    const g = ctx();
    g.strokeStyle = eraser ? "#ffffff" : color;
    g.lineWidth = size;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    g.moveTo(last.current.x, last.current.y);
    // Smooth curve through the middle of the last two points.
    const mid = { x: (last.current.x + p.x) / 2, y: (last.current.y + p.y) / 2 };
    g.quadraticCurveTo(last.current.x, last.current.y, mid.x, mid.y);
    g.lineTo(p.x, p.y);
    g.stroke();
    last.current = p;
  }
  const up = () => (last.current = null);

  function stepBack() {
    const prev = undo[undo.length - 1];
    if (!prev) return;
    ctx().putImageData(prev, 0, 0);
    setUndo(undo.slice(0, -1));
  }
  function clearAll() {
    snapshot();
    const c = canvas.current!;
    const g = c.getContext("2d")!;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, c.width, c.height);
    g.restore();
    setConfirmClear(false);
  }
  function done() {
    canvas.current!.toBlob((blob) => {
      if (blob) onDone(new File([blob], "tekening.png", { type: "image/png" }));
    }, "image/png");
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label="Tekenen"
    >
      <div className="flex items-center gap-2 px-3 pb-2 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <button
          onClick={onClose}
          aria-label="Stoppen zonder opslaan"
          className="rounded-full bg-card p-2 shadow-soft"
        >
          <X className="size-5" />
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold">
          {title ?? "🎨 Tekenen"}
        </p>
        <Button onClick={done} className="rounded-full">
          Klaar ✓
        </Button>
      </div>

      <div className="relative mx-3 flex-1 overflow-hidden rounded-3xl border-2 border-foreground/10 shadow-soft">
        <canvas
          ref={canvas}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onPointerLeave={up}
          className="h-full w-full touch-none bg-white"
          style={{ cursor: "crosshair" }}
        />
        {confirmClear && (
          <div className="absolute inset-x-4 top-4 rounded-2xl bg-card p-4 text-center shadow-soft">
            <p className="text-sm font-semibold">Alles wissen?</p>
            <p className="text-xs text-muted-foreground">
              Je kunt het daarna nog terugzetten met ↩️.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-full"
                onClick={() => setConfirmClear(false)}
              >
                Nee
              </Button>
              <Button className="flex-1 rounded-full" onClick={clearAll}>
                Ja, wissen
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3">
        <div className="flex gap-2 overflow-x-auto px-1 py-1.5">
          {DRAW_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                setColor(c);
                setEraser(false);
              }}
              aria-label={`Kleur ${c}`}
              className={`size-9 shrink-0 rounded-full border-2 transition-transform ${color === c && !eraser ? "scale-110 border-foreground" : "border-foreground/15"}`}
              style={{ background: c }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          {BRUSH_SIZES.map((b) => (
            <button
              key={b.id}
              onClick={() => setSize(b.px)}
              aria-label={`Penseel ${b.label}`}
              className={`flex size-11 items-center justify-center rounded-full ${size === b.px ? "bg-primary text-primary-foreground" : "bg-card shadow-soft"}`}
            >
              <span
                className="rounded-full bg-current"
                style={{ width: Math.min(b.px, 22), height: Math.min(b.px, 22) }}
              />
            </button>
          ))}
          <button
            onClick={() => setEraser(!eraser)}
            aria-label="Gum"
            aria-pressed={eraser}
            className={`flex size-11 items-center justify-center rounded-full ${eraser ? "bg-primary text-primary-foreground" : "bg-card shadow-soft"}`}
          >
            <Eraser className="size-5" />
          </button>
          <div className="flex-1" />
          <button
            onClick={stepBack}
            disabled={!undo.length}
            aria-label="Stap terug"
            className="flex size-11 items-center justify-center rounded-full bg-card shadow-soft disabled:opacity-40"
          >
            <Undo2 className="size-5" />
          </button>
          <button
            onClick={() => setConfirmClear(true)}
            aria-label="Alles wissen"
            className="flex size-11 items-center justify-center rounded-full bg-card shadow-soft"
          >
            <Trash2 className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
