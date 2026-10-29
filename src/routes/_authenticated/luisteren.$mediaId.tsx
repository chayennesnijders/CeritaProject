import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSignedImage } from "@/lib/articles";
import { clock, formatDuration, mediaKind, nextSpeed, resumeAt } from "@/lib/media";

export const Route = createFileRoute("/_authenticated/luisteren/$mediaId")({
  head: () => ({ meta: [{ title: "Luisteren — CeritaProject" }] }),
  component: MediaPage,
});

function MediaPage() {
  const { mediaId } = Route.useParams();
  const { data: item, isLoading } = useQuery({
    queryKey: ["media-item", mediaId],
    queryFn: async () =>
      (await supabase.from("media_items").select("*").eq("id", mediaId).maybeSingle()).data,
  });
  const { data: src } = useSignedImage("media", item?.media_path);
  const { data: cover } = useSignedImage("media", item?.cover_path);

  if (isLoading) return <p className="pt-6 text-sm text-muted-foreground">Laden…</p>;
  if (!item)
    return (
      <div className="pt-6">
        <p className="text-sm text-muted-foreground">Deze opname is er niet (meer).</p>
        <Link to="/luisteren" className="mt-3 inline-block text-sm text-primary underline">
          Terug naar Luisteren
        </Link>
      </div>
    );
  const k = mediaKind(item.kind);

  return (
    <div className="space-y-5 pt-2 pb-4">
      <Link to="/luisteren" className="text-sm text-primary underline">
        Terug naar Luisteren
      </Link>
      {item.media_type === "video" ? (
        src ? (
          <video
            src={src}
            controls
            playsInline
            poster={cover ?? undefined}
            className="w-full rounded-3xl bg-black shadow-soft"
          />
        ) : (
          <div className="aspect-video w-full animate-pulse rounded-3xl bg-muted" />
        )
      ) : (
        <div className="mx-auto aspect-square w-3/4 overflow-hidden rounded-[2rem] bg-secondary shadow-soft">
          {cover ? (
            <img
              src={cover}
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          ) : (
            <span className="flex h-full items-center justify-center text-8xl">{k.emoji}</span>
          )}
        </div>
      )}
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          {k.emoji} {k.label}
          {item.duration_seconds ? ` · ${formatDuration(item.duration_seconds)}` : ""}
        </p>
        <h1 className="mt-1 text-2xl leading-snug">{item.title}</h1>
      </div>
      {item.media_type === "audio" && src && <AudioPlayer id={item.id} src={src} />}
      {item.description && (
        <section className="rounded-3xl bg-card p-5 shadow-soft">
          <h2 className="text-lg">Waar gaat het over?</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{item.description}</p>
        </section>
      )}
      <p className="rounded-2xl bg-secondary p-4 text-xs text-secondary-foreground">
        💛 Raakt het je? Praat erover met iemand die je vertrouwt, stuur de beheerders een bericht,
        of bel gratis de Kindertelefoon (0800-0432) of 113 (0800-0113).
      </p>
    </div>
  );
}

/** Big, simple player: play/pause, 15 seconds back or forward, speed, and it remembers where you were. */
function AudioPlayer({ id, src }: { id: string; src: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const key = `cerita-luisteren-${id}`;

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    const save = () => {
      try {
        localStorage.setItem(key, String(Math.floor(a.currentTime)));
      } catch {
        // Niet erg: dan begin je de volgende keer gewoon vooraan.
      }
    };
    const t = setInterval(save, 5000);
    return () => {
      clearInterval(t);
      save();
    };
  }, [key]);

  function loaded() {
    const a = ref.current!;
    setDuration(a.duration || 0);
    let saved = 0;
    try {
      saved = Number(localStorage.getItem(key) ?? 0);
    } catch {
      saved = 0;
    }
    const start = resumeAt(saved, a.duration);
    if (start) a.currentTime = start;
  }
  function toggle() {
    const a = ref.current!;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  }
  const skip = (s: number) => {
    const a = ref.current!;
    a.currentTime = Math.min(Math.max(0, a.currentTime + s), a.duration || a.currentTime + s);
  };

  return (
    <div className="rounded-3xl bg-card p-5 shadow-soft">
      <audio
        ref={ref}
        src={src}
        preload="metadata"
        onLoadedMetadata={loaded}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={1}
        value={Math.min(time, duration || 0)}
        onChange={(e) => {
          ref.current!.currentTime = Number(e.target.value);
        }}
        aria-label="Waar je bent in de opname"
        className="w-full accent-primary"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{clock(time)}</span>
        <span>-{clock(Math.max(0, duration - time))}</span>
      </div>
      <div className="mt-3 flex items-center justify-center gap-5">
        <button
          onClick={() => skip(-15)}
          aria-label="15 seconden terug"
          className="relative rounded-full p-3 active:scale-90"
        >
          <RotateCcw className="size-7" />
          <span className="absolute inset-0 flex items-center justify-center pt-0.5 text-[9px] font-bold">
            15
          </span>
        </button>
        <button
          onClick={toggle}
          aria-label={playing ? "Pauze" : "Afspelen"}
          className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft active:scale-90"
        >
          {playing ? <Pause className="size-8" /> : <Play className="ml-1 size-8" />}
        </button>
        <button
          onClick={() => skip(15)}
          aria-label="15 seconden vooruit"
          className="relative rounded-full p-3 active:scale-90"
        >
          <RotateCw className="size-7" />
          <span className="absolute inset-0 flex items-center justify-center pt-0.5 text-[9px] font-bold">
            15
          </span>
        </button>
      </div>
      <div className="mt-2 text-center">
        <button
          onClick={() => {
            const s = nextSpeed(speed);
            setSpeed(s);
            ref.current!.playbackRate = s;
          }}
          className="rounded-full bg-muted px-3 py-1 text-xs font-semibold"
        >
          Snelheid {String(speed).replace(".", ",")}×
        </button>
      </div>
    </div>
  );
}
