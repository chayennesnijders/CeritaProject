import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { DiscoverTabs } from "@/components/DiscoverTabs";
import { useSignedImage } from "@/lib/articles";
import { formatDuration, isFresh, MEDIA_KINDS, mediaKind, type MediaKind } from "@/lib/media";
import { useMedia } from "@/lib/use-media";

export const Route = createFileRoute("/_authenticated/luisteren/")({
  head: () => ({
    meta: [
      { title: "Luisteren — CeritaProject" },
      { name: "description", content: "Podcasts, interviews en video's van CeritaProject." },
    ],
  }),
  component: ListenPage,
});

function ListenPage() {
  const { data: items = [], isLoading } = useMedia();
  const [kind, setKind] = useState<MediaKind | null>(null);
  const shown = items.filter((m) => !kind || m.kind === kind);
  const [newest, ...rest] = shown;
  const chip = (on: boolean) =>
    `shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${on ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground shadow-soft"}`;

  return (
    <div className="pt-2">
      <h1 className="text-3xl">Ontdekken</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Podcasts, interviews en video's. Zet je oortjes in 🎧
      </p>
      <DiscoverTabs active="luisteren" counts={{ luisteren: items.length }} />

      <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
        <button onClick={() => setKind(null)} className={chip(!kind)}>
          Alles
        </button>
        {(Object.keys(MEDIA_KINDS) as MediaKind[])
          .filter((k) => items.some((m) => m.kind === k))
          .map((k) => (
            <button
              key={k}
              onClick={() => setKind(kind === k ? null : k)}
              className={chip(kind === k)}
            >
              {MEDIA_KINDS[k].emoji} {MEDIA_KINDS[k].label}
            </button>
          ))}
      </div>

      {isLoading && <p className="mt-4 text-sm text-muted-foreground">Laden…</p>}
      {!isLoading && items.length === 0 && (
        <div className="mt-6 rounded-3xl bg-card p-6 text-center shadow-soft">
          <p className="text-4xl">🎧</p>
          <p className="mt-2 font-semibold">Hier komen podcasts en interviews</p>
          <p className="mt-1 text-sm text-muted-foreground">
            De eerste aflevering komt eraan. Kom snel terug!
          </p>
        </div>
      )}

      {newest && (
        <Link
          to="/luisteren/$mediaId"
          params={{ mediaId: newest.id }}
          className="relative mt-4 block overflow-hidden rounded-3xl bg-warm text-blush shadow-soft"
        >
          <Cover
            path={newest.cover_path}
            className="absolute inset-0 h-full w-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="relative p-5 pt-28">
            <span className="rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold text-foreground">
              {isFresh(newest) ? "✨ Nieuw" : "🎧 Nieuwste"} · {mediaKind(newest.kind).label}
            </span>
            <p className="mt-3 font-display text-2xl leading-snug text-white drop-shadow">
              {newest.title}
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-white">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary text-lg text-primary-foreground">
                ▶
              </span>
              {newest.media_type === "video" ? "Bekijk" : "Luister"}
              {newest.duration_seconds ? ` · ${formatDuration(newest.duration_seconds)}` : ""}
            </p>
          </div>
        </Link>
      )}

      <div className="mt-4 space-y-3">
        {rest.map((m) => {
          const k = mediaKind(m.kind);
          return (
            <Link
              key={m.id}
              to="/luisteren/$mediaId"
              params={{ mediaId: m.id }}
              className="flex items-center gap-4 rounded-3xl bg-card p-3 shadow-soft"
            >
              <span className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-secondary">
                <Cover path={m.cover_path} className="h-full w-full object-cover" />
                <span className="absolute inset-0 flex items-center justify-center text-2xl">
                  {m.cover_path ? "" : k.emoji}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {k.label}
                  {m.min_age >= 16 && (
                    <span className="ml-2 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                      16+
                    </span>
                  )}
                  {isFresh(m) && <span className="ml-2 text-primary">✨ Nieuw</span>}
                </span>
                <span className="block font-semibold leading-snug">{m.title}</span>
                <span className="text-[11px] text-muted-foreground">
                  {m.media_type === "video" ? "🎬" : "🎧"} {formatDuration(m.duration_seconds)} ·{" "}
                  {new Date(m.publish_at).toLocaleDateString("nl-NL", {
                    day: "numeric",
                    month: "long",
                  })}
                </span>
              </span>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                ▶
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Cover({ path, className }: { path: string | null; className: string }) {
  const { data: src } = useSignedImage("media", path);
  return src ? (
    <img
      src={src}
      alt=""
      className={className}
      onError={(e) => (e.currentTarget.style.display = "none")}
    />
  ) : null;
}
