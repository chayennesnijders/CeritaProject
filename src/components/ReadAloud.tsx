import { useEffect, useRef, useState } from "react";
import { Square, Volume2 } from "lucide-react";
import { speechChunks } from "@/lib/read-aloud";

/** Reads a text aloud with the phone's own Dutch voice (nothing is sent anywhere). */
export function ReadAloud({ text }: { text: string }) {
  const [supported, setSupported] = useState(false);
  const [playing, setPlaying] = useState(false);
  const stopped = useRef(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      stopped.current = true;
      if (typeof window !== "undefined" && "speechSynthesis" in window)
        window.speechSynthesis.cancel();
    };
  }, []);
  if (!supported) return null;

  function stop() {
    stopped.current = true;
    window.speechSynthesis.cancel();
    setPlaying(false);
  }
  function play() {
    const synth = window.speechSynthesis;
    synth.cancel();
    stopped.current = false;
    const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith("nl"));
    const chunks = speechChunks(text);
    setPlaying(true);
    chunks.forEach((c, i) => {
      const u = new SpeechSynthesisUtterance(c);
      u.lang = "nl-NL";
      if (voice) u.voice = voice;
      u.rate = 0.95;
      if (i === chunks.length - 1) u.onend = () => !stopped.current && setPlaying(false);
      u.onerror = () => setPlaying(false);
      synth.speak(u);
    });
  }

  return (
    <button
      onClick={playing ? stop : play}
      className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground active:scale-95"
      aria-label={playing ? "Stoppen met voorlezen" : "Voorlezen"}
    >
      {playing ? <Square className="size-3.5" /> : <Volume2 className="size-3.5" />}
      {playing ? "Stop" : "Voorlezen"}
    </button>
  );
}
