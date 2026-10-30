import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { embedUrl, isMusicUrl, musicService, playerHeight, songTipError } from "./music";

const sql = readFileSync("drizzle/migrations/0072_music_books.sql", "utf8");

describe("music links", () => {
  it("only accepts Spotify, YouTube and Apple Music", () => {
    expect(isMusicUrl("https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO")).toBe(true);
    expect(isMusicUrl("https://youtu.be/ZbZSe6N_BXs")).toBe(true);
    expect(isMusicUrl("http://open.spotify.com/playlist/x")).toBe(false);
    expect(isMusicUrl("https://evil.com/open.spotify.com/x")).toBe(false);
    expect(isMusicUrl("https://open.spotify.com.evil.com/x")).toBe(false);
    expect(musicService("https://music.apple.com/nl/playlist/x/pl.123")).toBe("apple");
  });
  it("turns links into a player", () => {
    expect(embedUrl("https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO?si=abc")).toBe(
      "https://open.spotify.com/embed/playlist/37i9dQZF1DX4sWSpwq3LiO",
    );
    expect(embedUrl("https://open.spotify.com/intl-nl/track/4uLU6hMCjMI75M1A2tKUQC")).toBe(
      "https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC",
    );
    expect(embedUrl("https://www.youtube.com/watch?v=ZbZSe6N_BXs")).toBe(
      "https://www.youtube-nocookie.com/embed/ZbZSe6N_BXs",
    );
    expect(embedUrl("https://youtu.be/ZbZSe6N_BXs")).toBe(
      "https://www.youtube-nocookie.com/embed/ZbZSe6N_BXs",
    );
    expect(embedUrl("https://www.youtube.com/playlist?list=PLabcdef12")).toBe(
      "https://www.youtube-nocookie.com/embed/videoseries?list=PLabcdef12",
    );
    expect(embedUrl("https://music.apple.com/nl/playlist/chill/pl.123")).toBe(
      "https://embed.music.apple.com/nl/playlist/chill/pl.123",
    );
    expect(playerHeight("https://open.spotify.com/track/x")).toBe(152);
  });
  it("uses the same rule as the database", () => {
    expect(sql).toContain(
      "open\\.spotify\\.com|(www\\.|music\\.)?youtube\\.com|youtu\\.be|music\\.apple\\.com",
    );
  });
  it("checks a song tip", () => {
    expect(songTipError("", "x", "")).toContain("titel");
    expect(songTipError("Happy", "Pharrell", "https://example.com")).toContain("Spotify");
    expect(songTipError("Happy", "Pharrell", "")).toBeNull();
  });
});
