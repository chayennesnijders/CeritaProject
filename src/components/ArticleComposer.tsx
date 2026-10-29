import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ARTICLE_CATEGORIES, categoryLabel, type ArticleCategory } from "@/lib/articles";
import { KINDS, kindInfo, type StoryKind } from "@/lib/discover";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Beheerders schrijven hier verhalen en artikelen; die verschijnen meteen onder Ontdekken (elk in een eigen tabblad). */
export function ArticleComposer() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [emoji, setEmoji] = useState("📖");
  const [category, setCategory] = useState<ArticleCategory>("in-je-hoofd");
  const [photo, setPhoto] = useState<File | null>(null);
  const [sixteen, setSixteen] = useState(false);
  const [kind, setKind] = useState<StoryKind>("verhaal");
  const [deleting, setDeleting] = useState<{ id: string; title: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: articles } = useQuery({
    queryKey: ["admin-articles"],
    queryFn: async () =>
      (
        await supabase
          .from("articles")
          .select("id, title, emoji, category, is_published, created_at, min_age, kind")
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-articles"] });
    qc.invalidateQueries({ queryKey: ["articles"] });
  };

  async function save() {
    setBusy(true);
    let image_url: string | null = null;
    if (photo) {
      const ext = photo.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("article-images").upload(path, photo);
      if (upErr) {
        toast.error("Foto uploaden mislukt: " + upErr.message);
        setBusy(false);
        return;
      }
      image_url = path;
    }
    const { error } = await supabase.from("articles").insert({
      title,
      body,
      emoji: emoji || "📖",
      category,
      image_url,
      min_age: sixteen ? 16 : 12,
      kind,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(kind === "verhaal" ? "Verhaal geplaatst" : "Artikel geplaatst");
    setTitle("");
    setBody("");
    setPhoto(null);
    setSixteen(false);
    refresh();
  }

  async function toggle(id: string, isPublished: boolean) {
    const { error } = await supabase
      .from("articles")
      .update({ is_published: !isPublished })
      .eq("id", id);
    if (error) toast.error(error.message);
    refresh();
  }

  async function setAge(id: string, minAge: 12 | 16) {
    const { error } = await supabase.from("articles").update({ min_age: minAge }).eq("id", id);
    if (error) toast.error(error.message);
    refresh();
  }

  async function setArticleKind(id: string, next: StoryKind) {
    const { error } = await supabase.from("articles").update({ kind: next }).eq("id", id);
    if (error) toast.error(error.message);
    refresh();
  }

  async function confirmRemove() {
    if (!deleting) return;
    const { data, error } = await supabase
      .from("articles")
      .delete()
      .eq("id", deleting.id)
      .select("id");
    if (error || !data?.length) toast.error(error?.message ?? "Verwijderen lukte niet.");
    else toast.success("Verwijderd.");
    setDeleting(null);
    refresh();
  }

  return (
    <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
      <h2 className="text-lg">Verhalen &amp; artikelen</h2>
      <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
        {KINDS.map((x) => (
          <button
            key={x.kind}
            onClick={() => setKind(x.kind)}
            className={`rounded-full py-1.5 text-sm font-semibold ${kind === x.kind ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {x.emoji} {x.kind === "verhaal" ? "Verhaal" : "Artikel"}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {kind === "verhaal"
          ? "Een verhaal is een echte ervaring van een jongere."
          : "Een artikel geeft uitleg of tips, bijvoorbeeld over angst of slapen."}
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="📖"
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          maxLength={4}
          className="w-16 rounded-2xl text-center"
        />
        <Input
          placeholder="Titel"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-2xl"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {ARTICLE_CATEGORIES.map((c) => (
          <Button
            key={c}
            variant={category === c ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => setCategory(c)}
          >
            {categoryLabel(c)}
          </Button>
        ))}
      </div>
      <Textarea
        placeholder={`${kind === "verhaal" ? "Het verhaal" : "Het artikel"}. Laat een regel over tussen de alinea's.`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={6}
        className="rounded-2xl"
      />
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-full border border-dashed border-muted-foreground/40 px-4 py-2.5 text-sm text-muted-foreground">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
        />
        {photo ? `📷 ${photo.name}` : "📷 Foto toevoegen (optioneel)"}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={sixteen}
          onChange={(e) => setSixteen(e.target.checked)}
          className="size-4 accent-primary"
        />
        Alleen voor 16+ (gaat over heel zware dingen)
      </label>
      <Button disabled={!title || !body || busy} onClick={save} className="w-full rounded-full">
        {busy ? "Bezig…" : "Plaatsen"}
      </Button>
      <div className="space-y-2 border-t border-muted pt-3">
        {articles?.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate">
              {a.emoji} {a.title}{" "}
              {!a.is_published && (
                <span className="text-xs text-muted-foreground">(verborgen)</span>
              )}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <button
                className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold"
                onClick={() =>
                  setArticleKind(a.id, kindInfo(a.kind).kind === "verhaal" ? "artikel" : "verhaal")
                }
                title="Tik om te wisselen tussen verhaal en artikel"
              >
                {kindInfo(a.kind).emoji}
              </button>
              <button
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${a.min_age >= 16 ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                onClick={() => setAge(a.id, a.min_age >= 16 ? 12 : 16)}
                title="Tik om te wisselen tussen iedereen (12+) en 16+"
              >
                {a.min_age >= 16 ? "16+" : "12+"}
              </button>
              <button
                className="text-xs text-primary underline"
                onClick={() => toggle(a.id, a.is_published)}
              >
                {a.is_published ? "Verbergen" : "Showen"}
              </button>
              <button
                className="text-xs text-destructive underline"
                onClick={() => setDeleting({ id: a.id, title: a.title })}
              >
                Verwijderen
              </button>
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        📖 = verhaal, 📰 = artikel. 12+ = iedereen, 16+ = alleen leden van 16 jaar en ouder. Tik op
        een labeltje om te wisselen.
      </p>
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleting?.title}" verdwijnt voor altijd uit de app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Nee, laat staan</AlertDialogCancel>
            <Button
              className="rounded-full bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmRemove}
            >
              Ja, verwijder
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
