import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ARTICLE_CATEGORIES, categoryLabel, type ArticleCategory } from "@/lib/articles";

/** Beheerders schrijven hier verhalen en tips; die verschijnen meteen onder Ontdekken. */
export function ArticleComposer() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [emoji, setEmoji] = useState("📖");
  const [category, setCategory] = useState<ArticleCategory>("familie");
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: articles } = useQuery({
    queryKey: ["admin-articles"],
    queryFn: async () =>
      (await supabase.from("articles").select("id, title, emoji, category, is_published, created_at").order("created_at", { ascending: false })).data ?? [],
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
    const { error } = await supabase.from("articles").insert({ title, body, emoji: emoji || "📖", category, image_url });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Verhaal geplaatst");
    setTitle("");
    setBody("");
    setPhoto(null);
    refresh();
  }

  async function toggle(id: string, isPublished: boolean) {
    const { error } = await supabase.from("articles").update({ is_published: !isPublished }).eq("id", id);
    if (error) toast.error(error.message);
    refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Dit verhaal definitief verwijderen?")) return;
    const { error } = await supabase.from("articles").delete().eq("id", id);
    if (error) toast.error(error.message);
    refresh();
  }

  return (
    <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
      <h2 className="text-lg">Verhalen &amp; tips</h2>
      <div className="flex gap-2">
        <Input placeholder="📖" value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} className="w-16 rounded-2xl text-center" />
        <Input placeholder="Titel" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-2xl" />
      </div>
      <div className="flex gap-2">
        {ARTICLE_CATEGORIES.map((c) => (
          <Button key={c} variant={category === c ? "default" : "outline"} size="sm" className="flex-1 rounded-full" onClick={() => setCategory(c)}>
            {categoryLabel(c)}
          </Button>
        ))}
      </div>
      <Textarea
        placeholder="Het verhaal. Laat een regel over tussen de alinea's."
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
      <Button disabled={!title || !body || busy} onClick={save} className="w-full rounded-full">
        {busy ? "Bezig…" : "Plaatsen"}
      </Button>
      <div className="space-y-2 border-t border-muted pt-3">
        {articles?.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate">
              {a.emoji} {a.title} {!a.is_published && <span className="text-xs text-muted-foreground">(verborgen)</span>}
            </span>
            <span className="flex shrink-0 gap-2">
              <button className="text-xs text-primary underline" onClick={() => toggle(a.id, a.is_published)}>
                {a.is_published ? "Verbergen" : "Showen"}
              </button>
              <button className="text-xs text-destructive underline" onClick={() => remove(a.id)}>
                Verwijderen
              </button>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
