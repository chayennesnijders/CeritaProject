import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

// Elke ochtend (na 7:00) poppen de dagtaken vanzelf op. Daarna blijft het
// lijstje bereikbaar via de knop op de diertjespagina.
type Todo = { id: string; title: string; done: boolean; rewarded: boolean };
type PetList = { id: string; title: string };

type Props = {
  open: boolean;
  petName: string;
  day: string;
  canCare: boolean;
  petLists: PetList[];
  currentList: PetList | undefined;
  listTodos: Todo[];
  todayTaskCount: number;
  doneTaskCount: number;
  onClose: () => void;
  onSelectList: (id: string) => void;
  onAddList: (title: string) => void;
  onRemoveList: (id: string) => Promise<boolean>;
  onAddTodo: (title: string) => void;
  onToggleTodo: (id: string, done: boolean, rewarded: boolean) => void;
  onRemoveTodo: (id: string) => void;
};

export function DailyTodoPopup({
  open,
  petName,
  day,
  canCare,
  petLists,
  currentList,
  listTodos,
  todayTaskCount,
  doneTaskCount,
  onClose,
  onSelectList,
  onAddList,
  onRemoveList,
  onAddTodo,
  onToggleTodo,
  onRemoveTodo,
}: Props) {
  const [newTodo, setNewTodo] = useState("");
  const [newList, setNewList] = useState("");
  // Alleen één invulveld tegelijk: het lijstje-veld verschijnt pas na een tik.
  const [showListForm, setShowListForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);


  useEffect(() => {
    if (!open) return;
    setShowListForm(false);
    setNewList("");
    const prev = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", esc);
    };
  }, [open, onClose]);

  if (!open) return null;

  const date = new Date(`${day}T12:00:00`);
  const dateText = date.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`To-do lijstje van ${petName}`}
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card p-5 pb-6 shadow-soft sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-2xl text-primary">🌅 Today's to-do</p>
            <p className="text-xs text-muted-foreground">{dateText} · voor {petName}</p>
          </div>
          <button onClick={onClose} aria-label="Sluiten" className="rounded-full bg-muted px-3 py-1 text-sm">✕</button>
        </div>

        <p className="mt-3 rounded-2xl bg-secondary p-3 text-xs text-secondary-foreground">
          {todayTaskCount === 0
            ? "Vul minstens één taak in — daarna kun je " + petName + " verzorgen."
            : doneTaskCount === todayTaskCount
              ? "Alles afgevinkt! " + petName + " is supertrots op je. 🎉"
              : `${doneTaskCount} van de ${todayTaskCount} taken afgevinkt. Elke vink maakt ${petName} blij (+5 XP).`}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {petLists.map((l) => (
            <div key={l.id} className="flex min-w-0 items-center gap-1">
              <Button size="sm" variant={currentList?.id === l.id ? "default" : "outline"} onClick={() => onSelectList(l.id)} className="max-w-52 truncate">{l.title}</Button>
              <Button size="icon" variant="ghost" aria-label={`Lijstje ${l.title} verwijderen`} title={`Lijstje ${l.title} verwijderen`} onClick={() => setDeleting(l.id)}><Trash2 className="size-4" /></Button>
            </div>
          ))}
          <button onClick={() => setShowListForm((v) => !v)} aria-expanded={showListForm}
            className="rounded-full border border-dashed border-primary px-3 py-1 text-xs">＋ lijstje</button>
        </div>

        {petLists.length === 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {["Mijn dag", "School", "Zelfzorg"].map((t) => (
              <button key={t} onClick={() => onAddList(t)} className="rounded-full border border-dashed border-primary px-3 py-1 text-xs">+ {t}</button>
            ))}
          </div>
        )}

        {showListForm && (
          <form onSubmit={(e) => { e.preventDefault(); const t = newList.trim(); if (t) onAddList(t); setNewList(""); setShowListForm(false); }} className="mt-3 flex gap-2">
            <input autoFocus value={newList} onChange={(e) => setNewList(e.target.value)} maxLength={40} placeholder="Naam van het lijstje, bijv. Weekend"
              className="flex-1 rounded-2xl border border-input bg-background px-3 py-2 text-sm" />
            <button className="rounded-2xl bg-muted px-3 text-xs font-semibold">Toevoegen</button>
          </form>
        )}


        {currentList && (
          <div className="mt-4 border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{currentList.title}</p>
              <Button size="sm" variant="ghost" onClick={() => setDeleting(currentList.id)}><Trash2 className="size-4" />Lijstje weg</Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Tik op een taak om hem af te vinken ✓</p>
            <ul className="mt-1 space-y-2">
              {listTodos.map((t) => (
                <li key={t.id}
                  role="checkbox"
                  aria-checked={t.done}
                  tabIndex={0}
                  onClick={() => onToggleTodo(t.id, !t.done, t.rewarded)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggleTodo(t.id, !t.done, t.rewarded); } }}
                  className={`flex cursor-pointer select-none items-center gap-3 rounded-2xl px-3 py-3 transition-colors ${t.done ? "bg-secondary" : "bg-muted active:bg-accent"}`}>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-base font-bold transition-colors ${t.done ? "border-primary bg-primary text-primary-foreground" : "border-primary/40 bg-background"}`}>
                    {t.done ? "✓" : ""}
                  </span>
                  <span className={`flex-1 text-base font-medium ${t.done ? "text-muted-foreground line-through" : ""}`}>{t.title}</span>
                  <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onRemoveTodo(t.id); }} aria-label={`${t.title} verwijderen`} title="Taak verwijderen" className="shrink-0"><Trash2 className="size-4" /></Button>
                </li>
              ))}
              {listTodos.length === 0 && <li className="text-sm text-muted-foreground">Nog geen taken voor vandaag — zet hieronder je eerste taak neer. 👇</li>}
            </ul>
            <form onSubmit={(e) => { e.preventDefault(); onAddTodo(newTodo); setNewTodo(""); }} className="mt-3 flex gap-2">
              <input value={newTodo} onChange={(e) => setNewTodo(e.target.value)} maxLength={80} placeholder="Bijv. water drinken, huiswerk"
                className="flex-1 rounded-2xl border border-input bg-background px-3 py-2 text-sm" />
              <button className="rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground">+</button>
            </form>
          </div>
        )}

        {deleting && <div role="alertdialog" aria-label="Lijstje verwijderen" className="mt-4 space-y-3 border-t border-border pt-3">
          <p className="text-sm font-semibold">Lijstje ‘{petLists.find((l) => l.id === deleting)?.title}’ verwijderen?</p>
          <p className="text-xs text-muted-foreground">De naam en de taken uit dit lijstje verdwijnen.</p>
          <div className="flex gap-2"><Button variant="destructive" disabled={busy} onClick={async () => { setBusy(true); try { if (await onRemoveList(deleting)) setDeleting(null); } finally { setBusy(false); } }}>Verwijderen</Button><Button variant="outline" disabled={busy} onClick={() => setDeleting(null)}>Annuleren</Button></div>
        </div>}
        <button onClick={onClose}
          className="mt-5 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground">
          {canCare ? "Klaar, nu verzorgen! 🐾" : "Later invullen"}
        </button>
        {!canCare && <p className="mt-2 text-center text-xs text-muted-foreground">Verzorgen blijft op slot tot er minstens één taak staat.</p>}
      </div>
    </div>
  );
}
