import { useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { embedUrl, musicService, playerHeight, SERVICE_LABEL } from "@/lib/music";
import { stopPlaying, useNowPlaying } from "@/lib/now-playing";

/**
 * The music player above the bottom menu. It stays mounted while you move through the app, so the
 * music keeps playing. Folding it in only makes it small; it doesn't stop.
 */
export function NowPlayingBar() {
  const now = useNowPlaying();
  const [small, setSmall] = useState(false);
  if (!now) return null;
  const src = embedUrl(now.url);
  const service = musicService(now.url);
  if (!src || !service) return null;
  const isVideo = service === "youtube";
  const full = Math.min(playerHeight(now.url), isVideo ? 200 : 152);
  return (
    <div className="fixed inset-x-0 bottom-[calc(max(env(safe-area-inset-bottom),0.75rem)+4.6rem)] z-30 mx-auto max-w-md px-3 print:hidden">
      <div className="overflow-hidden rounded-3xl border-2 border-secondary bg-card shadow-soft">
        <div className="flex items-center gap-2 px-3 py-1.5 text-xs">
          <span className="min-w-0 flex-1 truncate font-semibold">
            🎶 {now.title}{" "}
            <span className="font-normal text-muted-foreground">· {SERVICE_LABEL[service]}</span>
          </span>
          <button
            aria-label={small ? "Groter" : "Kleiner"}
            onClick={() => setSmall(!small)}
            className="p-1"
          >
            {small ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
          <button aria-label="Stoppen" onClick={stopPlaying} className="p-1">
            <X className="size-4" />
          </button>
        </div>
        {/* Kept in the page (only very small when folded) so the music keeps playing. */}
        <iframe
          src={`${src}${isVideo ? `${src.includes("?") ? "&" : "?"}autoplay=1&playsinline=1` : ""}`}
          title={`${SERVICE_LABEL[service]}-speler`}
          className="w-full border-0"
          style={{ height: small ? (isVideo ? 2 : 80) : full }}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        />
      </div>
    </div>
  );
}
