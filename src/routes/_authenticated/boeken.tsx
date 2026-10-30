import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { DiscoverTabs } from "@/components/DiscoverTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { coverUrl, ratingLabel, SHELF, spineColor, type ShelfStatus } from "@/lib/books";

export const Route = createFileRoute("/_authenticated/boeken")({
  head: () => ({
    meta: [
      { title: "Boeken — CeritaProject" },
      { name: "description", content: "Boekentips en je eigen boekenkast op CeritaProject." },
    ],
  }),
  component: BooksPage,
});

type Book = {
  id: string;
  title: string;
  author: string;
  description: string | null;
  theme: string | null;
  isbn: string | null;
};

function Cover({ book }: { book: Book }) {
  const [failed, setFailed] = useState(false);
  const src = coverUrl(book.isbn);
  if (src && !failed)
    return (
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        className="h-28 w-20 shrink-0 rounded-lg object-cover shadow-soft"
      />
    );
  return (
    <div
      className="flex h-28 w-20 shrink-0 flex-col justify-between rounded-lg p-2 text-[10px] font-bold leading-tight text-[#2a1a14] shadow-soft"
      style={{ background: spineColor(book.title) }}
    >
      <span className="line-clamp-4">{book.title}</span>
      <span className="opacity-70">📚</span>
    </div>
  );
}

/** Book tips from CeritaProject, your own private bookshelf with stars, and suggesting a book. */
function BooksPage() {
  const { data: me } = useMe();
  const uid = me?.user.id;
  const qc = useQueryClient();
  const [view, setView] = useState<"alle" | "kast">("alle");
  const [open, setOpen] = useState<string | null>(null);
  const [tip, setTip] = useState({ title: "", author: "", why: "" });
  const [tipOpen, setTipOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["books", uid],
    enabled: !!uid,
    queryFn: async () => {
      const [b, shelf, ratings] = await Promise.all([
        supabase.from("books").select("id, title, author, description, theme, isbn").order("title"),
        supabase.from("book_shelf").select("book_id, status, rating").eq("user_id", uid!),
        supabase.rpc("book_ratings"),
      ]);
      return {
        books: (b.data ?? []) as Book[],
        shelf: new Map((shelf.data ?? []).map((s) => [s.book_id, s])),
        ratings: new Map((ratings.data ?? []).map((r) => [r.book_id, r])),
      };
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["books"] });
  const books = (data?.books ?? []).filter((b) => view === "alle" || data?.shelf.has(b.id));

  async function setStatus(bookId: string, status: ShelfStatus) {
    if (!uid) return;
    const cur = data?.shelf.get(bookId);
    const { error } =
      cur?.status === status
        ? await supabase.from("book_shelf").delete().eq("user_id", uid).eq("book_id", bookId)
        : await supabase.from("book_shelf").upsert({
            user_id: uid,
            book_id: bookId,
            status,
            rating: status === "gelezen" ? (cur?.rating ?? null) : null,
            updated_at: new Date().toISOString(),
          });
    if (error) toast.error("Opslaan lukte niet.");
    refresh();
  }
  async function rate(bookId: string, rating: number) {
    if (!uid) return;
    const { error } = await supabase
      .from("book_shelf")
      .update({ rating })
      .eq("user_id", uid)
      .eq("book_id", bookId);
    if (error) toast.error("Opslaan lukte niet.");
    else toast.success("Dankjewel voor je sterren! ⭐");
    refresh();
  }
  async function sendTip() {
    if (!uid) return;
    const body = `📚 Boektip: "${tip.title.trim()}" van ${tip.author.trim()}.${tip.why.trim() ? ` ${tip.why.trim()}` : ""}`;
    const { error } = await supabase
      .from("admin_messages")
      .insert({ user_id: uid, topic: "idee", body: body.slice(0, 2000) });
    if (error) {
      toast.error("Versturen lukte niet.");
      return;
    }
    toast.success("Bedankt voor je tip! De beheerders kijken ernaar. 📚");
    setTip({ title: "", author: "", why: "" });
    setTipOpen(false);
  }

  return (
    <div className="space-y-4 pt-2">
      <div>
        <h1 className="text-3xl">Ontdekken</h1>
        <DiscoverTabs active="boeken" />
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
        <button
          onClick={() => setView("alle")}
          className={`rounded-full py-2 text-sm font-semibold ${view === "alle" ? "bg-card shadow-soft" : ""}`}
        >
          📚 Boekentips
        </button>
        <button
          onClick={() => setView("kast")}
          className={`rounded-full py-2 text-sm font-semibold ${view === "kast" ? "bg-card shadow-soft" : ""}`}
        >
          🗂️ Mijn boekenkast ({data?.shelf.size ?? 0})
        </button>
      </div>
      {view === "kast" && (
        <p className="text-xs text-muted-foreground">
          Alleen jij ziet je boekenkast. Anderen zien alleen het gemiddelde aantal sterren.
        </p>
      )}
      {books.length === 0 && (
        <p className="rounded-3xl bg-card p-4 text-sm text-muted-foreground shadow-soft">
          {view === "kast"
            ? "Je boekenkast is nog leeg. Zet een boek op 'Wil ik lezen'!"
            : "Nog geen boekentips."}
        </p>
      )}
      {books.map((b) => {
        const mine = data?.shelf.get(b.id);
        const r = data?.ratings.get(b.id);
        const rl = ratingLabel(r?.average, r?.ratings);
        return (
          <article key={b.id} className="space-y-3 rounded-3xl bg-card p-4 shadow-soft">
            <div className="flex gap-3">
              <Cover book={b} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-tight">{b.title}</p>
                <p className="text-sm text-muted-foreground">{b.author}</p>
                <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                  {b.theme && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
                      {b.theme}
                    </span>
                  )}
                  {rl && <span className="rounded-full bg-muted px-2 py-0.5">{rl}</span>}
                  {!!r?.readers && (
                    <span className="rounded-full bg-muted px-2 py-0.5">{r.readers}× gelezen</span>
                  )}
                </div>
                {b.description && (
                  <button
                    onClick={() => setOpen(open === b.id ? null : b.id)}
                    className="mt-1 text-left text-xs text-muted-foreground"
                  >
                    <span className={open === b.id ? "" : "line-clamp-2"}>{b.description}</span>
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {SHELF.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStatus(b.id, s.id)}
                  className={`rounded-2xl px-1 py-2 text-[11px] font-semibold ${mine?.status === s.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
            {mine?.status === "gelezen" && (
              <div className="flex items-center justify-center gap-1">
                <span className="mr-1 text-xs text-muted-foreground">Jouw sterren:</span>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => rate(b.id, n)}
                    aria-label={`${n} sterren`}
                    className="text-2xl active:scale-90"
                  >
                    {(mine.rating ?? 0) >= n ? "⭐" : "☆"}
                  </button>
                ))}
              </div>
            )}
          </article>
        );
      })}

      <section className="rounded-3xl bg-secondary p-4 text-secondary-foreground shadow-soft">
        {!tipOpen ? (
          <button onClick={() => setTipOpen(true)} className="w-full text-left">
            <p className="font-semibold">💡 Weet jij een goed boek?</p>
            <p className="text-xs">Tip het aan de beheerders, misschien komt het erbij!</p>
          </button>
        ) : (
          <div className="space-y-2">
            <p className="font-semibold">💡 Tip een boek</p>
            <Input
              value={tip.title}
              maxLength={120}
              onChange={(e) => setTip({ ...tip, title: e.target.value })}
              placeholder="Titel"
              className="rounded-2xl bg-background"
            />
            <Input
              value={tip.author}
              maxLength={120}
              onChange={(e) => setTip({ ...tip, author: e.target.value })}
              placeholder="Schrijver"
              className="rounded-2xl bg-background"
            />
            <Textarea
              value={tip.why}
              maxLength={500}
              onChange={(e) => setTip({ ...tip, why: e.target.value })}
              placeholder="Waarom is het een fijn boek? (mag leeg)"
              className="rounded-2xl bg-background"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-full"
                onClick={() => setTipOpen(false)}
              >
                Annuleren
              </Button>
              <Button
                disabled={!tip.title.trim() || !tip.author.trim()}
                className="flex-1 rounded-full"
                onClick={sendTip}
              >
                Versturen
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
