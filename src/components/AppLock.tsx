import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PIN_KEY = "cerita-app-pin";
const OLD_DIARY_KEY = "cerita-dagboek-pin";
const RESET_KEY = "cerita-app-pin-reset";
const RELOCK_MS = 60_000; // na 1 minuut weg uit de app gaat hij weer op slot

/** Slot op de hele app (code per toestel). Wikkel de app-inhoud hierin. */
export function AppLock({ children }: { children: ReactNode }) {
  const [pin, setPin] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    // Oude dagboek-code wordt de app-code, zodat niemand opnieuw hoeft in te stellen.
    const old = localStorage.getItem(OLD_DIARY_KEY);
    if (old && !localStorage.getItem(PIN_KEY)) localStorage.setItem(PIN_KEY, old);
    localStorage.removeItem(OLD_DIARY_KEY);
    if (localStorage.getItem(RESET_KEY)) {
      localStorage.removeItem(RESET_KEY);
      localStorage.removeItem(PIN_KEY);
      toast.success("Je code is gewist. Stel gerust een nieuwe in op je profiel.");
    }
    const stored = localStorage.getItem(PIN_KEY);
    setPin(stored);
    setUnlocked(!stored);
    setLoaded(true);
    const onPin = () => setPin(localStorage.getItem(PIN_KEY));
    window.addEventListener("cerita-pin-changed", onPin);
    let hiddenAt = 0;
    const onVis = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > RELOCK_MS && localStorage.getItem(PIN_KEY)) setUnlocked(false);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => { window.removeEventListener("cerita-pin-changed", onPin); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  if (!loaded) return null;
  if (pin && !unlocked)
    return <LockScreen pin={pin} onUnlock={() => setUnlocked(true)} onReset={() => { localStorage.removeItem(PIN_KEY); setPin(null); setUnlocked(true); }} />;
  return <>{children}</>;
}

/** Instelling op het profiel: code kiezen of slot eraf halen. */
/** `bare`: without its own card and title (inside the profile settings). */
export function AppLockSettings({ bare = false }: { bare?: boolean }) {
  const [has, setHas] = useState(false);
  const [newPin, setNewPin] = useState("");
  useEffect(() => setHas(!!localStorage.getItem(PIN_KEY)), []);
  const change = (p: string | null) => {
    if (p) localStorage.setItem(PIN_KEY, p); else localStorage.removeItem(PIN_KEY);
    setHas(!!p);
    window.dispatchEvent(new Event("cerita-pin-changed"));
  };
  return (
    <section className={bare ? "space-y-3" : "space-y-3 rounded-3xl bg-card p-5 shadow-soft"}>
      {!bare && <h2 className="text-lg">🔒 Slot op de app</h2>}
      {has ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span>De app opent met jouw code op dit apparaat.</span>
          <button className="shrink-0 text-xs text-destructive underline" onClick={() => { change(null); toast.success("Slot eraf"); }}>Slot eraf</button>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Kies een code van 4 tot 6 cijfers. Daarna vraagt de app om die code als je hem opent.</p>
          <div className="flex gap-2">
            <Input type="password" inputMode="numeric" maxLength={6} placeholder="Kies een code" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} className="rounded-2xl" />
            <Button disabled={newPin.length < 4} onClick={() => { change(newPin); setNewPin(""); toast.success("Slot gezet"); }} className="rounded-full">Zet slot</Button>
          </div>
        </>
      )}
    </section>
  );
}

function LockScreen({ pin, onUnlock, onReset }: { pin: string; onUnlock: () => void; onReset: () => void }) {
  const [entry, setEntry] = useState("");
  const [forgot, setForgot] = useState(false);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  async function resetWithPassword() {
    const { data } = await supabase.auth.getUser();
    const mail = data.user?.email;
    if (!mail) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: mail, password: pw });
    setBusy(false);
    if (error) { toast.error("Wachtwoord klopt niet"); return; }
    toast.success("Je code is gewist. Stel gerust een nieuwe in op je profiel.");
    onReset();
  }
  async function resetViaLogin() {
    localStorage.setItem(RESET_KEY, "1");
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }
  function tryUnlock() {
    if (entry === pin) onUnlock();
    else { toast.error("Verkeerde code"); setEntry(""); }
  }
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      {forgot ? (
        <>
          <p className="text-4xl">🔑</p>
          <h1 className="text-2xl">Code vergeten?</h1>
          <p className="max-w-xs text-sm text-muted-foreground">Vul het wachtwoord van je account in. Dan wissen we je code. Al je spullen blijven gewoon bewaard.</p>
          <Input type="password" placeholder="Wachtwoord van je account" value={pw} onChange={(e) => setPw(e.target.value)} className="w-64 rounded-2xl" />
          <Button disabled={busy || !pw} onClick={resetWithPassword} className="rounded-full px-8">Code wissen</Button>
          <button onClick={resetViaLogin} className="max-w-xs text-sm text-primary underline">Log je in met Google of weet je je wachtwoord niet? Log opnieuw in</button>
          <button onClick={() => setForgot(false)} className="text-xs text-muted-foreground underline">Terug</button>
        </>
      ) : (
        <>
          <p className="text-4xl">🔒</p>
          <h1 className="text-2xl">CeritaProject is op slot</h1>
          <Input type="password" inputMode="numeric" maxLength={6} placeholder="Jouw code" value={entry} autoFocus
            onChange={(e) => setEntry(e.target.value)} onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
            className="w-40 rounded-2xl text-center text-lg tracking-widest" />
          <Button onClick={tryUnlock} className="rounded-full px-8">Openen</Button>
          <button onClick={() => setForgot(true)} className="text-sm text-primary underline">Code vergeten?</button>
        </>
      )}
    </div>
  );
}
