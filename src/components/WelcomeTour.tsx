import { useEffect, useLayoutEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useMe } from "@/lib/auth";

const KEY = "cerita-rondleiding-gezien";
type Step = { target?: string; emoji: string; title: string; text: string };
const STEPS: Step[] = [
  { emoji: "👋", title: "Welkom bij CeritaProject!", text: "We laten je even zien waar alles staat. Kijk naar het oplichtende vakje." },
  { target: "home", emoji: "🏠", title: "Home", text: "Hier: je dagopdracht, de quote van vandaag en berichten van de beheerders." },
  { target: "community", emoji: "👥", title: "Community", text: "Hier vind je groepen met leeftijdsgenoten. Tik op een groep om mee te chatten." },
  { target: "ontdekken", emoji: "🧭", title: "Ontdekken", text: "Hier staan artikelen en anonieme verhalen van andere jongeren." },
  { target: "berichten", emoji: "💬", title: "Berichten", text: "Hier zijn je privéchats en kun je vrienden zoeken." },
  { target: "profiel", emoji: "👤", title: "Profiel", text: "Hier: je foto, gebruikersnaam, dagboek en licht/donker scherm." },
  { target: "diertje", emoji: "🐾", title: "Je diertje", text: "Dit pootje: vul elke ochtend je to-do lijstje in en verzorg je diertje. Overslaan is nooit erg!" },
  { target: "shop", emoji: "🛍️", title: "CeritaShop", text: "Dit tasje: de shop. Betaal wat je voelt." },
  { emoji: "🛡️", title: "Beheerders", text: "Zie je een schildje bij een profielfoto? Dat is een beheerder. Bij hen kun je altijd terecht. Veel plezier!" },
];

/** Rondleiding die de echte knoppen laat oplichten; één keer per toestel voor nieuwe leden (account < 7 dagen). */
export function WelcomeTour() {
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    if (!me?.user || localStorage.getItem(KEY)) return;
    if (Date.now() - new Date(me.user.created_at).getTime() < 7 * 86400_000) {
      // Markeer meteen als gezien: de rondleiding komt maar één keer, ook als hij halverwege wordt afgesloten.
      localStorage.setItem(KEY, "1");
      setOpen(true);
    }
  }, [me?.user]);
  const steps = STEPS.filter((s) => !s.target || typeof document === "undefined" || document.querySelector(`[data-tour="${s.target}"]`));
  const s = steps[Math.min(i, steps.length - 1)]!;
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const el = s.target ? document.querySelector(`[data-tour="${s.target}"]`) : null;
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, s.target]);
  if (!open) return null;
  const close = () => { localStorage.setItem(KEY, "1"); setOpen(false); };
  const last = i >= steps.length - 1;
  const pad = 6;
  const atTop = rect ? rect.top < window.innerHeight / 2 : false;
  return (
    <div className="fixed inset-0 z-50">
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-2xl ring-4 ring-primary transition-all duration-300"
          style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, boxShadow: "0 0 0 9999px color-mix(in oklab, var(--foreground) 60%, transparent)" }}
        />
      ) : (
        <div className="absolute inset-0 bg-foreground/60" />
      )}
      <div className={`absolute inset-x-0 mx-auto w-[calc(100%-2rem)] max-w-sm ${rect ? (atTop ? "top-24" : "bottom-32") : "top-1/2 -translate-y-1/2"}`}>
        <div className="rounded-3xl border-2 border-foreground bg-card p-5 text-center shadow-soft">
          <div className="text-4xl">{s.emoji}</div>
          <h2 className="mt-2 text-xl font-extrabold">{s.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
          <div className="mt-3 flex justify-center gap-1">
            {steps.map((_, n) => <span key={n} className={`size-2 rounded-full ${n === i ? "bg-primary" : "bg-muted"}`} />)}
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" className="flex-1 rounded-full" onClick={i === 0 ? close : () => setI(i - 1)}>{i === 0 ? "Overslaan" : "Terug"}</Button>
            <Button className="flex-1 rounded-full" onClick={last ? close : () => setI(i + 1)}>{last ? "Aan de slag!" : "Volgende"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
