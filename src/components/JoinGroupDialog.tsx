import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** Shown when you open a group you're not in yet: what it is, and a big "Word lid" button. */
export function JoinGroupDialog({
  open,
  group,
  memberCount,
  busy,
  onJoin,
  onBrowse,
}: {
  open: boolean;
  group: { emoji: string | null; name: string; description: string | null };
  memberCount: number;
  busy: boolean;
  onJoin: () => void;
  onBrowse: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onBrowse()}>
      <DialogContent className="max-w-sm rounded-3xl text-center">
        <DialogHeader className="items-center">
          <p className="text-5xl">{group.emoji ?? "💬"}</p>
          <DialogTitle className="text-2xl">{group.name}</DialogTitle>
          {group.description && <DialogDescription>{group.description}</DialogDescription>}
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          👥 {memberCount} {memberCount === 1 ? "lid" : "leden"} · alleen leeftijdsgenoten
        </p>
        <p className="rounded-2xl bg-muted p-3 text-xs text-muted-foreground">
          Je krijgt alleen een melding als iemand op jou reageert of je tagt. Je kunt de groep
          altijd dempen of weer verlaten.
        </p>
        <Button disabled={busy} onClick={onJoin} className="h-12 w-full rounded-full text-base">
          {busy ? "Even geduld…" : "👋 Word lid"}
        </Button>
        <button onClick={onBrowse} className="text-sm text-muted-foreground underline">
          Eerst even rondkijken
        </button>
      </DialogContent>
    </Dialog>
  );
}
