import { useState } from "react";
import { toast } from "sonner";
import { LESSON_LEVELS, type LessonLevel } from "@/lib/teacher";
import { useTeacherLevels } from "@/lib/use-teacher-levels";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** The three groups as tap-to-choose chips. */
export function LevelChips({ levels, onToggle }: { levels: readonly string[]; onToggle: (id: LessonLevel) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Voor welke groep geef je les?">
      {LESSON_LEVELS.map((lv) => {
        const on = levels.includes(lv.id);
        return (
          <button
            key={lv.id}
            type="button"
            role="checkbox"
            aria-checked={on}
            onClick={() => onToggle(lv.id)}
            className={`rounded-full px-3 py-2 text-left text-sm font-semibold transition active:scale-95 ${on ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
          >
            {on ? "✓ " : ""}
            {lv.label}
            <span className="block text-[11px] font-normal opacity-75">{lv.hint}</span>
          </button>
        );
      })}
    </div>
  );
}

const toggled = (list: readonly LessonLevel[], id: LessonLevel) =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

/**
 * Shown as soon as a teacher logs in and has not chosen a group yet: which group(s) do you teach?
 * The lessons follow that choice; it can be changed later in the profile.
 */
export function TeacherLevelDialog({ uid }: { uid: string }) {
  const { levels, loaded, save } = useTeacherLevels(uid);
  const [pick, setPick] = useState<LessonLevel[]>([]);
  const [later, setLater] = useState(false);
  const [saving, setSaving] = useState(false);
  const open = loaded && levels.length === 0 && !later;
  async function confirm() {
    setSaving(true);
    await save(pick);
    setSaving(false);
    toast.success("Je lessen staan klaar voor jouw groep 🎉");
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && setLater(true)}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle>Welkom! Voor welke groep geef je les?</DialogTitle>
          <DialogDescription>
            Dan zie je alleen de lessen die bij jouw groep passen. Meer kiezen mag. Je kunt het later altijd veranderen in
            je profiel.
          </DialogDescription>
        </DialogHeader>
        <LevelChips levels={pick} onToggle={(id) => setPick((p) => toggled(p, id))} />
        <Button disabled={!pick.length || saving} onClick={() => void confirm()} className="h-11 rounded-full">
          {saving ? "Opslaan…" : "Laat mijn lessen zien"}
        </Button>
        <button type="button" onClick={() => setLater(true)} className="text-xs text-muted-foreground underline">
          Later kiezen
        </button>
      </DialogContent>
    </Dialog>
  );
}

/** In the profile: change the groups; at least one stays chosen. */
export function TeacherLevelSettings({ uid }: { uid: string }) {
  const { levels, loaded, save } = useTeacherLevels(uid);
  if (!loaded) return <p className="text-sm text-muted-foreground">Laden…</p>;
  return (
    <div className="space-y-2">
      <LevelChips
        levels={levels}
        onToggle={(id) => {
          const next = toggled(levels, id);
          if (!next.length) {
            toast("Kies minstens één groep.");
            return;
          }
          void save(next).then(() => toast.success("Opgeslagen"));
        }}
      />
      <p className="text-xs text-muted-foreground">Je ziet alleen de lessen voor de groepen die je hier kiest.</p>
    </div>
  );
}
