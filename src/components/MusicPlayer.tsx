import { useState } from "react";
import { embedUrl, musicService, playerHeight, SERVICE_LABEL } from "@/lib/music";

/**
 * A Spotify, YouTube or Apple Music player inside the app. It only loads after a tap, so those
 * services are not contacted until the member chooses to listen.
 */
export function MusicPlayer({ url, label = "Luisteren" }: { url: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const src = embedUrl(url);
  const service = musicService(url);
  if (!src || !service)
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-primary underline"
      >
        Openen
      </a>
    );
  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground active:scale-95"
      >
        ▶ {label}
        <span className="text-[11px] font-normal opacity-80">via {SERVICE_LABEL[service]}</span>
      </button>
    );
  return (
    <iframe
      src={src}
      title={`${SERVICE_LABEL[service]}-speler`}
      className="w-full rounded-2xl border-0"
      style={{ height: playerHeight(url) }}
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
    />
  );
}
