import { embedUrl, musicService, SERVICE_LABEL } from "@/lib/music";
import { play, useNowPlaying } from "@/lib/now-playing";

/**
 * Start a Spotify, YouTube or Apple Music player. It plays in the bar above the menu, so it keeps
 * playing on other screens. Nothing is loaded from those services until the member taps.
 */
export function MusicPlayer({
  url,
  label = "Luisteren",
  title = "Muziek",
}: {
  url: string;
  label?: string;
  title?: string;
}) {
  const now = useNowPlaying();
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
  if (now?.url === url)
    return <p className="text-sm font-semibold text-primary">🎶 Speelt nu, onderaan in beeld</p>;
  return (
    <button
      onClick={() => play(url, title)}
      className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground active:scale-95"
    >
      ▶ {label}
      <span className="text-[11px] font-normal opacity-80">via {SERVICE_LABEL[service]}</span>
    </button>
  );
}
