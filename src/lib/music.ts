/** Same rule as is_music_url() in the database: only Spotify, YouTube and Apple Music links. */
export const MUSIC_URL =
  /^https:\/\/(open\.spotify\.com|(www\.|music\.)?youtube\.com|youtu\.be|music\.apple\.com)\/[A-Za-z0-9/_?=&.%-]+$/;
export const isMusicUrl = (url: string) => url.length <= 300 && MUSIC_URL.test(url);

export type MusicService = "spotify" | "youtube" | "apple";
export function musicService(url: string): MusicService | null {
  if (!isMusicUrl(url)) return null;
  if (url.includes("spotify.com")) return "spotify";
  if (url.includes("apple.com")) return "apple";
  return "youtube";
}
export const SERVICE_LABEL: Record<MusicService, string> = {
  spotify: "Spotify",
  youtube: "YouTube",
  apple: "Apple Music",
};

/**
 * The address of the built-in player for a music link, or null if it cannot be played in the app.
 * YouTube uses the privacy-friendly youtube-nocookie.com.
 */
export function embedUrl(url: string): string | null {
  if (!isMusicUrl(url)) return null;
  const u = new URL(url);
  if (u.hostname === "open.spotify.com") {
    const m =
      /^\/(?:intl-[a-z]+\/)?(playlist|track|album|episode|show|artist)\/([A-Za-z0-9]+)/.exec(
        u.pathname,
      );
    return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : null;
  }
  if (u.hostname === "music.apple.com")
    return `https://embed.music.apple.com${u.pathname}${u.search}`;
  const list = u.searchParams.get("list");
  const video = u.hostname === "youtu.be" ? u.pathname.slice(1) : u.searchParams.get("v");
  if (video && /^[A-Za-z0-9_-]{6,20}$/.test(video))
    return `https://www.youtube-nocookie.com/embed/${video}`;
  if (list && /^[A-Za-z0-9_-]{6,64}$/.test(list))
    return `https://www.youtube-nocookie.com/embed/videoseries?list=${list}`;
  return null;
}

/** Players are shorter for a single song than for a whole playlist. */
export const playerHeight = (url: string) =>
  /spotify\.com\/(intl-[a-z]+\/)?track\//.test(url)
    ? 152
    : musicService(url) === "youtube"
      ? 220
      : 352;

export function songTipError(title: string, artist: string, url: string) {
  if (!title.trim()) return "Vul de titel van het liedje in.";
  if (!artist.trim()) return "Vul in van wie het liedje is.";
  if (url.trim() && !isMusicUrl(url.trim()))
    return "Gebruik een link van Spotify, YouTube of Apple Music, of laat hem leeg.";
  return null;
}
