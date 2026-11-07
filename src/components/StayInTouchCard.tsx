import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { enablePush, pushMessage } from "@/lib/push-client";
import { DEFAULT_REMINDER_HOUR, REMINDER_HOURS } from "@/lib/daily-reminder";

const LATER_KEY = "cerita-meldingen-later";
const LATER_DAYS = 7;

function pushOn(): boolean {
  try {
    return typeof Notification !== "undefined" && Notification.permission === "granted";
  } catch {
    return false;
  }
}
function snoozed(): boolean {
  try {
    const t = Number(localStorage.getItem(LATER_KEY) ?? 0);
    return Date.now() - t < LATER_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

/**
 * Home screen: helps members not to miss anything. First "turn on notifications" (testers said they
 * got none: before, this was only in Profiel), then an opt-in daily reminder for their pet.
 */
export function StayInTouchCard() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const p = me?.profile;
  const [push, setPush] = useState(true);
  const [hidden, setHidden] = useState(true);
  const [hour, setHour] = useState<number>(DEFAULT_REMINDER_HOUR);
  useEffect(() => {
    setPush(pushOn());
    setHidden(snoozed());
  }, []);
  if (!me || !p || hidden) return null;
  const reminderOn = !!p.daily_reminder;
  if (push && reminderOn) return null;

  const later = () => {
    try {
      localStorage.setItem(LATER_KEY, String(Date.now()));
    } catch {
      /* shows again next time */
    }
    setHidden(true);
  };

  async function turnOnPush() {
    try {
      const r = await enablePush(me!.user.id);
      (r === "registered" ? toast.success : toast)(pushMessage(r));
      setPush(pushOn());
    } catch {
      toast.error("Meldingen aanzetten lukte niet. Probeer het via Profiel → Meldingen.");
    }
  }
  async function turnOnReminder() {
    const { error } = await supabase
      .from("profiles")
      .update({ daily_reminder: true, reminder_hour: hour })
      .eq("id", p!.id);
    if (error) {
      toast.error("Opslaan lukte niet. Probeer het later opnieuw.");
      return;
    }
    toast.success(`Top! Je krijgt om ${hour}:00 een seintje als je je diertje nog niet hebt gezien 🐰`);
    void qc.invalidateQueries({ queryKey: ["me"] });
  }

  return (
    <section className="space-y-3 rounded-3xl border-2 border-dashed border-primary bg-card p-4 shadow-soft">
      {!push ? (
        <>
          <div className="flex items-start gap-3">
            <span className="text-3xl">🔔</span>
            <div className="min-w-0">
              <p className="font-semibold">Mis niks: zet meldingen aan</p>
              <p className="text-xs text-muted-foreground">
                Dan zie je het als iemand je een bericht stuurt, je een compliment krijgt of je beurt is in een spelletje.
                Op een iPhone werkt dit alleen als de app op je beginscherm staat.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void turnOnPush()} className="flex-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Meldingen aanzetten
            </button>
            <button onClick={later} className="rounded-full px-3 py-2 text-sm text-muted-foreground">
              Later
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <span className="text-3xl">🐰</span>
            <div className="min-w-0">
              <p className="font-semibold">Een seintje voor je diertje?</p>
              <p className="text-xs text-muted-foreground">
                Eén keer per dag, alleen als je je diertje of dagboek die dag nog niet hebt gezien. Je stille uren gaan
                altijd voor. Uitzetten kan in Profiel.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>Om</span>
            <select
              id="herinnering-uur"
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              className="rounded-full border bg-background px-3 py-1.5 font-semibold"
              aria-label="Tijd van de herinnering"
            >
              {REMINDER_HOURS.map((h) => (
                <option key={h} value={h}>
                  {h}:00
                </option>
              ))}
            </select>
            <button onClick={() => void turnOnReminder()} className="flex-1 rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground">
              Ja, graag
            </button>
            <button onClick={later} className="rounded-full px-3 py-2 text-muted-foreground">
              Nee, dank je
            </button>
          </div>
        </>
      )}
    </section>
  );
}
