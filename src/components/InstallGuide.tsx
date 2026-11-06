import { useEffect, useState } from "react";
import { Riti } from "@/components/Riti";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { INSTALL_STEPS, isSamsungBrowser, platformOf, shouldShowInstall, type Platform } from "@/lib/install";

const SEEN_KEY = "cerita-beginscherm-uitleg";

/** Step-by-step: put the app on your home screen (needed for push messages on iPhone). */
export function InstallGuide({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [platform, setPlatform] = useState<Platform>("ios");
  const [samsung, setSamsung] = useState(false);
  useEffect(() => {
    const p = platformOf(navigator.userAgent);
    setPlatform(p === "other" ? "ios" : p);
    setSamsung(isSamsungBrowser(navigator.userAgent));
  }, []);
  const steps = INSTALL_STEPS[platform === "android" ? "android" : "ios"];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90dvh] max-w-sm overflow-y-auto rounded-3xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex justify-center">
          <Riti size={100} expression="blij" />
        </div>
        <DialogHeader>
          <DialogTitle className="text-center">Zet CeritaProject op je beginscherm 📲</DialogTitle>
          <DialogDescription className="text-center">
            Dan open je de app met één tik, net als een gewone app. Op een iPhone kun je alleen zo
            pushmeldingen krijgen.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
          {(["ios", "android"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`rounded-full py-1.5 text-sm font-semibold ${platform === p ? "bg-card shadow-soft" : ""}`}
            >
              {p === "ios" ? "🍎 iPhone" : "🤖 Android"}
            </button>
          ))}
        </div>
        {platform === "android" && samsung && (
          <div className="rounded-2xl border-2 border-primary bg-card p-3 text-sm">
            <p className="font-semibold">Je gebruikt Samsung Internet</p>
            <p className="mt-1 text-muted-foreground">
              Daar blokkeert Google Play Protect soms de installatie (&lsquo;Onveilige app geblokkeerd&rsquo;).
              Dat ligt niet aan CeritaProject. Kopieer het adres <b>app.ceritaproject.nl</b> en open het in
              <b> Chrome</b>; daar werkt installeren wel.
            </p>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(window.location.origin).catch(() => {});
              }}
              className="mt-2 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              📋 Adres kopiëren
            </button>
          </div>
        )}
        <ol className="space-y-2">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3 rounded-2xl bg-muted p-3 text-sm">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-base text-primary-foreground">
                {s.emoji}
              </span>
              <span className="pt-1">
                <strong>Stap {i + 1}.</strong> {s.text}
              </span>
            </li>
          ))}
        </ol>
        <Button className="w-full rounded-full" onClick={() => onOpenChange(false)}>
          Begrepen!
        </Button>
      </DialogContent>
    </Dialog>
  );
}

/** Shows the guide once on a phone where the app is not on the home screen yet. */
export function AutoInstallGuide() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(SEEN_KEY) === "1";
    } catch {
      seen = true;
    }
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!shouldShowInstall({ platform: platformOf(navigator.userAgent), standalone, seen }))
      return undefined;
    const t = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(t);
  }, []);
  function change(o: boolean) {
    setOpen(o);
    if (!o)
      try {
        localStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* then it may show once more */
      }
  }
  return <InstallGuide open={open} onOpenChange={change} />;
}
