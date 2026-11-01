import { useSyncExternalStore } from "react";

/**
 * What is playing right now. The player itself lives in the app shell, so the music keeps going
 * when you open another screen (YouTube stopped when its page was left).
 */
export type NowPlaying = { url: string; title: string } | null;

let current: NowPlaying = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function play(url: string, title: string) {
  current = { url, title };
  emit();
}
export function stopPlaying() {
  current = null;
  emit();
}
export function useNowPlaying(): NowPlaying {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => null,
  );
}
