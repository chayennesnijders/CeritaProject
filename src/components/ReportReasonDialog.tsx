import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const QUICK = ["Gemeen of kwetsend", "Pesten", "Ongepast", "Spam", "Ik maak me zorgen om iemand"];

/**
 * In-app "why are you reporting this?" (native prompt() can be blocked in app views and looks
 * scary). `ask(title)` opens it and resolves with the reason, or null when cancelled.
 */
export function useReportReason() {
  const [title, setTitle] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const done = useRef<((r: string | null) => void) | null>(null);

  function ask(t: string) {
    setTitle(t);
    setReason("");
    return new Promise<string | null>((resolve) => {
      done.current = resolve;
    });
  }
  function finish(r: string | null) {
    done.current?.(r);
    done.current = null;
    setTitle(null);
  }

  const dialog = (
    <Dialog open={title !== null} onOpenChange={(o) => !o && finish(null)}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle>🚩 {title}</DialogTitle>
          <DialogDescription>
            Een beheerder kijkt ernaar. De ander ziet niet dat jij het hebt gemeld.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setReason(q)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${reason === q ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              {q}
            </button>
          ))}
        </div>
        <Textarea
          value={reason}
          maxLength={500}
          rows={3}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Vertel kort wat er aan de hand is…"
          className="rounded-2xl"
        />
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 rounded-full" onClick={() => finish(null)}>
            Annuleren
          </Button>
          <Button
            disabled={!reason.trim()}
            className="flex-1 rounded-full"
            onClick={() => finish(reason.trim())}
          >
            Melden
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
  return { ask, dialog };
}
