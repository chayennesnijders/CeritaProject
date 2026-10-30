import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { QUIET_PRESETS } from "@/lib/quiet-hours";
import { getTextSize, setTextSize, TEXT_SIZES, type TextSize } from "@/lib/text-size";

/** Quiet hours for push messages, saved on the account. */
export function QuietHours({
  uid,
  quietStart,
  quietEnd,
}: {
  uid: string;
  quietStart: number | null;
  quietEnd: number | null;
}) {
  const qc = useQueryClient();
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
    <div className="space-y-2">
      <p className="text-sm font-semibold">🌙 Stille uren</p>
      <p className="text-xs text-muted-foreground">
        In deze uren krijg je geen pushmeldingen. Goed voor je slaap.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {QUIET_PRESETS.map((p) => (
          <Button
            key={p.id}
            variant={current === p.id ? "default" : "outline"}
            className="h-auto whitespace-normal rounded-2xl py-2 text-xs"
            onClick={() => setQuiet(p.start, p.end)}
          >
            {p.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

/** Text size for the whole app (this device). */
export function TextSizePicker() {
  const [size, setSize] = useState<TextSize>("normaal");
  useEffect(() => setSize(getTextSize()), []);
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">🔠 Lettergrootte</p>
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
  );
}
