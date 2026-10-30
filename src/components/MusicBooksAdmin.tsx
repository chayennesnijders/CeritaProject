import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { isMusicUrl } from "@/lib/music";
import { cleanIsbn } from "@/lib/books";

const emptyPlaylist = { title: "", emoji: "🎵", description: "", url: "", min_age: 12, sort: 0 };
const emptyBook = { title: "", author: "", description: "", theme: "", isbn: "", min_age: 12 };
type Pending = { kind: "playlist" | "book" | "tip"; id: string; name: string } | null;

/** Beheer → Muziek & boeken: playlists, book tips and the members' song tips. */
export function MusicBooksAdmin() {
  const qc = useQueryClient();
  const [pl, setPl] = useState(emptyPlaylist);
  const [plEdit, setPlEdit] = useState<string | null>(null);
  const [bk, setBk] = useState(emptyBook);
  const [bkEdit, setBkEdit] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);

  const { data } = useQuery({
    queryKey: ["admin-music-books"],
    queryFn: async () => {
      const [p, b, t] = await Promise.all([
        supabase.from("playlists").select("*").order("sort").order("created_at"),
        supabase.from("books").select("*").order("title"),
        supabase
          .from("song_tips")
          .select(
            "id, title, artist, url, hidden, age_group, created_at, author:profiles(display_name)",
          )
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      return { playlists: p.data ?? [], books: b.data ?? [], tips: t.data ?? [] };
    },
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-music-books"] });
    qc.invalidateQueries({ queryKey: ["playlists"] });
    qc.invalidateQueries({ queryKey: ["books"] });
    qc.invalidateQueries({ queryKey: ["song-tips"] });
  };

  async function savePlaylist() {
    if (!isMusicUrl(pl.url.trim())) {
      toast.error("Plak een link van Spotify, YouTube of Apple Music.");
      return;
    }
    const row = {
      ...pl,
      url: pl.url.trim(),
      title: pl.title.trim(),
      description: pl.description.trim() || null,
    };
    const { error } = plEdit
      ? await supabase.from("playlists").update(row).eq("id", plEdit)
      : await supabase.from("playlists").insert(row);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Playlist opgeslagen");
    setPl(emptyPlaylist);
    setPlEdit(null);
    refresh();
  }
  async function saveBook() {
    const isbn = bk.isbn.trim() ? cleanIsbn(bk.isbn) : null;
    if (bk.isbn.trim() && !isbn) {
      toast.error("Dat ISBN klopt niet (10 of 13 cijfers).");
      return;
    }
    const row = {
      title: bk.title.trim(),
      author: bk.author.trim(),
      description: bk.description.trim() || null,
      theme: bk.theme.trim() || null,
      isbn,
      min_age: bk.min_age,
    };
    const { error } = bkEdit
      ? await supabase.from("books").update(row).eq("id", bkEdit)
      : await supabase.from("books").insert(row);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Boek opgeslagen");
    setBk(emptyBook);
    setBkEdit(null);
    refresh();
  }
  async function hideTip(id: string, hidden: boolean) {
    const { error } = await supabase.from("song_tips").update({ hidden }).eq("id", id);
    toast[error ? "error" : "success"](
      error ? error.message : hidden ? "Verborgen" : "Weer zichtbaar",
    );
    refresh();
  }
  async function confirmDelete() {
    if (!pending) return;
    const table =
      pending.kind === "playlist" ? "playlists" : pending.kind === "book" ? "books" : "song_tips";
    const { data: gone, error } = await supabase
      .from(table)
      .delete()
      .eq("id", pending.id)
      .select("id");
    setPending(null);
    if (error || !gone?.length) {
      toast.error(error?.message ?? "Weghalen lukte niet.");
      return;
    }
    toast.success("Weggehaald");
    if (pending.id === plEdit) setPlEdit(null);
    if (pending.id === bkEdit) setBkEdit(null);
    refresh();
  }
  const ageButtons = (value: number, set: (v: number) => void) => (
    <div className="flex gap-2">
      {[12, 16].map((a) => (
        <Button
          key={a}
          type="button"
          size="sm"
          variant={value === a ? "default" : "outline"}
          className="rounded-full"
          onClick={() => set(a)}
        >
          {a}+
        </Button>
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
        <h2 className="text-lg">🎧 {plEdit ? "Playlist aanpassen" : "Playlist toevoegen"}</h2>
        <p className="text-xs text-muted-foreground">
          Maak een playlist in Spotify (of YouTube / Apple Music), kies Delen → Link kopiëren en
          plak hem hier.
        </p>
        <div className="flex gap-2">
          <Input
            value={pl.emoji}
            maxLength={8}
            onChange={(e) => setPl({ ...pl, emoji: e.target.value })}
            className="w-16 rounded-2xl text-center"
          />
          <Input
            value={pl.title}
            maxLength={60}
            onChange={(e) => setPl({ ...pl, title: e.target.value })}
            placeholder="Titel, bijv. Rustig worden"
            className="rounded-2xl"
          />
        </div>
        <Input
          value={pl.description}
          maxLength={200}
          onChange={(e) => setPl({ ...pl, description: e.target.value })}
          placeholder="Korte uitleg (mag leeg)"
          className="rounded-2xl"
        />
        <Input
          value={pl.url}
          onChange={(e) => setPl({ ...pl, url: e.target.value })}
          placeholder="https://open.spotify.com/playlist/…"
          className="rounded-2xl"
          inputMode="url"
        />
        <div className="flex items-center justify-between">
          {ageButtons(pl.min_age, (v) => setPl({ ...pl, min_age: v }))}
          <Input
            type="number"
            value={pl.sort}
            onChange={(e) => setPl({ ...pl, sort: Number(e.target.value) || 0 })}
            className="w-20 rounded-2xl"
            aria-label="Volgorde"
          />
        </div>
        <div className="flex gap-2">
          {plEdit && (
            <Button
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => {
                setPl(emptyPlaylist);
                setPlEdit(null);
              }}
            >
              Annuleren
            </Button>
          )}
          <Button
            disabled={pl.title.trim().length < 2 || !pl.url.trim()}
            className="flex-1 rounded-full"
            onClick={savePlaylist}
          >
            Opslaan
          </Button>
        </div>
        <div className="space-y-2 pt-2">
          {data?.playlists.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-2xl bg-muted p-2 text-sm">
              <span className="text-xl">{p.emoji}</span>
              <span className="min-w-0 flex-1 truncate">
                {p.title} <span className="text-xs text-muted-foreground">({p.min_age}+)</span>
              </span>
              <button
                className="text-xs text-primary underline"
                onClick={() => {
                  setPlEdit(p.id);
                  setPl({
                    title: p.title,
                    emoji: p.emoji,
                    description: p.description ?? "",
                    url: p.url,
                    min_age: p.min_age,
                    sort: p.sort,
                  });
                }}
              >
                Aanpassen
              </button>
              <button
                className="text-xs text-destructive underline"
                onClick={() => setPending({ kind: "playlist", id: p.id, name: p.title })}
              >
                Weg
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
        <h2 className="text-lg">📚 {bkEdit ? "Boek aanpassen" : "Boek toevoegen"}</h2>
        <Input
          value={bk.title}
          maxLength={120}
          onChange={(e) => setBk({ ...bk, title: e.target.value })}
          placeholder="Titel"
          className="rounded-2xl"
        />
        <Input
          value={bk.author}
          maxLength={120}
          onChange={(e) => setBk({ ...bk, author: e.target.value })}
          placeholder="Schrijver"
          className="rounded-2xl"
        />
        <Textarea
          value={bk.description}
          maxLength={600}
          onChange={(e) => setBk({ ...bk, description: e.target.value })}
          placeholder="Waar gaat het over?"
          className="rounded-2xl"
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={bk.theme}
            maxLength={40}
            onChange={(e) => setBk({ ...bk, theme: e.target.value })}
            placeholder="Thema, bijv. Angst"
            className="rounded-2xl"
          />
          <Input
            value={bk.isbn}
            onChange={(e) => setBk({ ...bk, isbn: e.target.value })}
            placeholder="ISBN (voor de kaft)"
            className="rounded-2xl"
            inputMode="numeric"
          />
        </div>
        {ageButtons(bk.min_age, (v) => setBk({ ...bk, min_age: v }))}
        <div className="flex gap-2">
          {bkEdit && (
            <Button
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => {
                setBk(emptyBook);
                setBkEdit(null);
              }}
            >
              Annuleren
            </Button>
          )}
          <Button
            disabled={!bk.title.trim() || !bk.author.trim()}
            className="flex-1 rounded-full"
            onClick={saveBook}
          >
            Opslaan
          </Button>
        </div>
        <div className="space-y-2 pt-2">
          {data?.books.map((b) => (
            <div key={b.id} className="flex items-center gap-2 rounded-2xl bg-muted p-2 text-sm">
              <span className="min-w-0 flex-1 truncate">
                {b.title}{" "}
                <span className="text-xs text-muted-foreground">
                  · {b.author} ({b.min_age}+)
                </span>
              </span>
              <button
                className="text-xs text-primary underline"
                onClick={() => {
                  setBkEdit(b.id);
                  setBk({
                    title: b.title,
                    author: b.author,
                    description: b.description ?? "",
                    theme: b.theme ?? "",
                    isbn: b.isbn ?? "",
                    min_age: b.min_age,
                  });
                }}
              >
                Aanpassen
              </button>
              <button
                className="text-xs text-destructive underline"
                onClick={() => setPending({ kind: "book", id: b.id, name: b.title })}
              >
                Weg
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Boektips van leden komen binnen bij Berichten.
        </p>
      </section>

      <section className="space-y-2 rounded-3xl bg-card p-5 shadow-soft">
        <h2 className="text-lg">💬 Liedjestips van leden</h2>
        <p className="text-xs text-muted-foreground">
          Alle leeftijdsgroepen. Verberg een tip als hij niet oké is.
        </p>
        {data?.tips.length === 0 && <p className="text-sm text-muted-foreground">Nog geen tips.</p>}
        {data?.tips.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 rounded-2xl p-2 text-sm ${t.hidden ? "bg-destructive/10" : "bg-muted"}`}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">
                {t.title} · {t.artist}
              </span>
              <span className="block text-xs text-muted-foreground">
                {(t.author as { display_name?: string } | null)?.display_name ?? "Lid"} ·{" "}
                {t.age_group}
                {t.url && (
                  <>
                    {" "}
                    ·{" "}
                    <a href={t.url} target="_blank" rel="noopener noreferrer" className="underline">
                      link
                    </a>
                  </>
                )}
              </span>
            </span>
            <button
              className="text-xs text-primary underline"
              onClick={() => hideTip(t.id, !t.hidden)}
            >
              {t.hidden ? "Tonen" : "Verbergen"}
            </button>
            <button
              className="text-xs text-destructive underline"
              onClick={() => setPending({ kind: "tip", id: t.id, name: t.title })}
            >
              Weg
            </button>
          </div>
        ))}
      </section>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>"{pending?.name}" weghalen?</AlertDialogTitle>
            <AlertDialogDescription>Dit kun je niet terugdraaien.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Nee</AlertDialogCancel>
            <Button className="rounded-full" onClick={confirmDelete}>
              Ja, weghalen
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
