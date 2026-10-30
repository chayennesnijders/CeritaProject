import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { QUIET_PRESETS } from "@/lib/quiet-hours";
import { getTextSize, setTextSize, TEXT_SIZES, type TextSize } from "@/lib/text-size";

/** Profiel: quiet hours for push messages (saved on the account) and text size (this device). */
export function ComfortSettings({
  uid,
  quietStart,
  quietEnd,
}: {
  uid: string;
  quietStart: number | null;
  quietEnd: number | null;
}) {
  const qc = useQueryClient();
  const [size, setSize] = useState<TextSize>("normaal");
  useEffect(() => setSize(getTextSize()), []);
  const current =
    QUIET_PRESETS.find((p) => p.start === quietStart && p.end === quietEnd)?.id ?? "uit";

  async function setQuiet(start: number | null, end: number | null) {
    const { error } = await supabase
      .from("profiles")
      .update({ quiet_start: start, quiet_end: end })
      .eq("id", uid);
    toast[error ? "error" : "success"](
      error
        ? "Opslaan lukte niet."
        : start === null
          ? "Stille uren staan uit"
          : "Stille uren opgeslagen 🌙",
    );
    qc.invalidateQueries();
  }

  return (
    <div className="space-y-4 rounded-3xl bg-card p-5 shadow-soft">
      <div className="space-y-2">
        <h2 className="text-lg">🌙 Stille uren</h2>
        <p className="text-sm text-muted-foreground">
          In deze uren krijg je geen pushmeldingen. Goed voor je slaap (en je huiswerk).
        </p>
        <div className="grid gap-2">
          {QUIET_PRESETS.map((p) => (
            <Button
              key={p.id}
              variant={current === p.id ? "default" : "outline"}
              className="h-auto justify-start whitespace-normal rounded-2xl py-2 text-left"
              onClick={() => setQuiet(p.start, p.end)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="text-lg">🔠 Lettergrootte</h2>
        <p className="text-sm text-muted-foreground">
          Maak alle tekst in de app groter. Geldt alleen voor dit apparaat.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {TEXT_SIZES.map((t) => (
            <Button
              key={t.id}
              variant={size === t.id ? "default" : "outline"}
              className="h-auto flex-col rounded-2xl py-2"
              onClick={() => {
                setSize(t.id);
                setTextSize(t.id);
              }}
            >
              <span style={{ fontSize: t.px }} className="font-bold leading-none">
                Aa
              </span>
              <span className="text-[11px]">{t.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
