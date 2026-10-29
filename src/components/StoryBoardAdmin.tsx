import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { notifyStoryVoters } from "@/lib/push.functions";
import { challengeDay } from "@/lib/challenges";
import { STORY_COLUMNS, moveStatus, plannedLabel, type StoryStatus } from "@/lib/story-board";

type Story = {
  id: string;
  title: string;
  teaser: string | null;
  emoji: string;
  status: string;
  planned_date: string | null;
  sort: number;
  votes: number;
  article_id: string | null;
  published_at: string | null;
};
type Draft = { title: string; teaser: string; emoji: string; planned_date: string };
const EMPTY: Draft = { title: "", teaser: "", emoji: "📖", planned_date: "" };

/** Planning board for admins: drag cards between columns (or use the arrows on a phone). "Gepland" shows up for members. */
export function StoryBoardAdmin() {
  const qc = useQueryClient();
  const notify = useServerFn(notifyStoryVoters);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Story | null>(null);
  const [publishing, setPublishing] = useState<Story | null>(null);
  const [articleId, setArticleId] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const today = challengeDay();

  const { data: stories = [] } = useQuery({
    queryKey: ["story-board"],
    queryFn: async () => ((await supabase.rpc("story_board")).data ?? []) as Story[],
  });
  const { data: articles = [] } = useQuery({
    queryKey: ["articles-for-board"],
    queryFn: async () =>
      (
        await supabase
          .from("articles")
          .select("id, title")
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(30)
      ).data ?? [],
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["story-board"] });
  };

  async function save(id: string | null) {
    const title = draft.title.trim();
    if (title.length < 2) {
      toast.error("Geef het verhaal een titel.");
      return;
    }
    const row = {
      title,
      teaser: draft.teaser.trim() || null,
      emoji: draft.emoji.trim() || "📖",
      planned_date: draft.planned_date || null,
    };
    const { error } = id
      ? await supabase.from("story_plans").update(row).eq("id", id)
      : await supabase.from("story_plans").insert(row);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDraft(EMPTY);
    setAdding(false);
    setEditing(null);
    refresh();
  }

  async function move(story: Story, status: StoryStatus) {
    if (status === story.status) return;
    if (status === "gepland" && !story.planned_date)
      toast("Tip: geef het verhaal een datum, dan zien leden wanneer het komt. 📅");
    const { error } = await supabase
      .from("story_plans")
      .update({ status, sort: Date.now() / 1000 })
      .eq("id", story.id);
    if (error) toast.error(error.message);
    else refresh();
  }

  async function confirmDelete() {
    if (!deleting) return;
    const { data, error } = await supabase
      .from("story_plans")
      .delete()
      .eq("id", deleting.id)
      .select("id");
    if (error || !data?.length) toast.error("Verwijderen lukte niet.");
    else {
      toast.success("Kaartje verwijderd.");
      refresh();
    }
    setDeleting(null);
  }

  async function publish() {
    if (!publishing) return;
    const { error } = await supabase
      .from("story_plans")
      .update({ status: "verschenen", article_id: articleId || null })
      .eq("id", publishing.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    const r = await notify({ data: { planId: publishing.id } }).catch(() => null);
    toast.success(
      r && r.users > 0
        ? `Verschenen! ${r.users} ${r.users === 1 ? "lid krijgt" : "leden krijgen"} een melding. 🎉`
        : "Verschenen! 🎉",
    );
    setPublishing(null);
    setArticleId("");
    refresh();
  }

  const startEdit = (s: Story) => {
    setEditing(s.id);
    setDraft({
      title: s.title,
      teaser: s.teaser ?? "",
      emoji: s.emoji,
      planned_date: s.planned_date ?? "",
    });
  };
  const done = stories.filter((s) => s.status === "verschenen");

  const form = (id: string | null) => (
    <div className="space-y-2 rounded-2xl bg-card p-3 shadow-soft">
      <div className="flex gap-2">
        <Input
          aria-label="Emoji"
          value={draft.emoji}
          maxLength={4}
          onChange={(e) => setDraft({ ...draft, emoji: e.target.value })}
          className="w-14 rounded-xl text-center"
        />
        <Input
          placeholder="Titel van het verhaal"
          value={draft.title}
          maxLength={120}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          className="rounded-xl"
        />
      </div>
      <Textarea
        placeholder="Korte teaser voor de leden (mag leeg)"
        value={draft.teaser}
        maxLength={300}
        rows={2}
        onChange={(e) => setDraft({ ...draft, teaser: e.target.value })}
        className="rounded-xl"
      />
      <label className="flex items-center gap-2 text-xs">
        📅 Datum{" "}
        <Input
          type="date"
          value={draft.planned_date}
          onChange={(e) => setDraft({ ...draft, planned_date: e.target.value })}
          className="h-9 rounded-xl"
        />
      </label>
      <div className="flex gap-2">
        <Button size="sm" className="flex-1 rounded-full" onClick={() => save(id)}>
          Opslaan
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="rounded-full"
          onClick={() => {
            setAdding(false);
            setEditing(null);
            setDraft(EMPTY);
          }}
        >
          Annuleren
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="rounded-3xl bg-card p-4 shadow-soft">
        <h2 className="text-lg">Verhalenbord</h2>
        <p className="text-sm text-muted-foreground">
          Plan je komende verhalen. Sleep kaartjes naar een andere kolom, of tik op ◀ ▶. Wat op{" "}
          <b>Gepland</b> staat, zien leden bij Ontdekken onder "Binnenkort" en ze kunnen er een
          hartje aan geven.
        </p>
        {!adding && (
          <Button
            size="sm"
            className="mt-3 rounded-full"
            onClick={() => {
              setEditing(null);
              setDraft(EMPTY);
              setAdding(true);
            }}
          >
            + Nieuw idee
          </Button>
        )}
        {adding && <div className="mt-3">{form(null)}</div>}
      </div>

      <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2">
        {STORY_COLUMNS.map((col) => {
          const cards = stories.filter((s) => s.status === col.id);
          return (
            <section
              key={col.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                const s = stories.find((x) => x.id === dragId);
                if (s) move(s, col.id);
                setDragId(null);
              }}
              className={`w-64 shrink-0 snap-start rounded-3xl p-3 ${col.id === "gepland" ? "bg-accent" : "bg-muted"}`}
            >
              <h3 className="mb-2 flex items-center justify-between text-sm font-semibold">
                <span>
                  {col.emoji} {col.label}
                </span>
                <span className="rounded-full bg-background px-2 text-xs">{cards.length}</span>
              </h3>
              <div className="min-h-16 space-y-2">
                {cards.map((s) =>
                  editing === s.id ? (
                    <div key={s.id}>{form(s.id)}</div>
                  ) : (
                    <article
                      key={s.id}
                      draggable
                      onDragStart={() => setDragId(s.id)}
                      onDragEnd={() => setDragId(null)}
                      className={`cursor-grab rounded-2xl bg-card p-3 shadow-soft active:cursor-grabbing ${dragId === s.id ? "opacity-50" : ""}`}
                    >
                      <p className="font-semibold">
                        <span className="mr-1">{s.emoji}</span>
                        {s.title}
                      </p>
                      {s.teaser && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {s.teaser}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
                        {s.planned_date && (
                          <span className="rounded-full bg-muted px-2 py-0.5">
                            📅 {plannedLabel(s.planned_date, today)}
                          </span>
                        )}
                        {s.status === "gepland" && (
                          <span className="rounded-full bg-muted px-2 py-0.5">❤️ {s.votes}</span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          disabled={!moveStatus(col.id, -1)}
                          onClick={() => move(s, moveStatus(col.id, -1)!)}
                          aria-label="Naar vorige kolom"
                        >
                          <ChevronLeft className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          disabled={!moveStatus(col.id, 1)}
                          onClick={() => move(s, moveStatus(col.id, 1)!)}
                          aria-label="Naar volgende kolom"
                        >
                          <ChevronRight className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          onClick={() => {
                            setAdding(false);
                            startEdit(s);
                          }}
                          aria-label="Bewerken"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-destructive"
                          onClick={() => setDeleting(s)}
                          aria-label="Verwijderen"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      {s.status === "gepland" && (
                        <Button
                          size="sm"
                          className="mt-1 w-full rounded-full"
                          onClick={() => {
                            setPublishing(s);
                            setArticleId("");
                          }}
                        >
                          Verschenen 🎉
                        </Button>
                      )}
                    </article>
                  ),
                )}
                {cards.length === 0 && (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    Sleep hier een kaartje heen
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {done.length > 0 && (
        <div className="rounded-3xl bg-card p-4 shadow-soft">
          <button
            className="w-full text-left text-sm font-semibold"
            onClick={() => setShowDone(!showDone)}
          >
            🎉 Verschenen ({done.length}) {showDone ? "▲" : "▼"}
          </button>
          {showDone && (
            <ul className="mt-2 space-y-1 text-sm">
              {done.map((s) => (
                <li key={s.id}>
                  {s.emoji} {s.title}{" "}
                  <span className="text-xs text-muted-foreground">· ❤️ {s.votes}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Kaartje verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleting?.title}" verdwijnt van het bord, ook de hartjes van leden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Nee, laat staan</AlertDialogCancel>
            <Button
              className="rounded-full bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Ja, verwijder
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!publishing} onOpenChange={(o) => !o && setPublishing(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {publishing?.emoji} "{publishing?.title}" is verschenen!
            </AlertDialogTitle>
            <AlertDialogDescription>
              Kies het verhaal in Ontdekken, dan kunnen leden er meteen naartoe. Wie een hartje gaf,
              krijgt een melding.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <select
            value={articleId}
            onChange={(e) => setArticleId(e.target.value)}
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
          >
            <option value="">Geen link (alleen melden)</option>
            {articles.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Nog niet</AlertDialogCancel>
            <Button className="rounded-full" onClick={publish}>
              Ja, verschenen 🎉
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
