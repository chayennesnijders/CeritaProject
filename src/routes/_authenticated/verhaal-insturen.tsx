import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ARTICLE_CATEGORIES, categoryLabel, type ArticleCategory } from "@/lib/articles";

export const Route = createFileRoute("/_authenticated/verhaal-insturen")({
  head: () => ({
    meta: [
      { title: "Deel jouw verhaal — CeritaProject" },
      { name: "description", content: "Stuur je eigen verhaal in. Het wordt anoniem geplaatst na beoordeling." },
      { property: "og:title", content: "Deel jouw verhaal — CeritaProject" },
      { property: "og:description", content: "Stuur je eigen verhaal in. Het wordt anoniem geplaatst na beoordeling." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SubmitStoryPage,
});

function SubmitStoryPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<ArticleCategory>("in-je-hoofd");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("story_submissions").insert({
      user_id: u.user!.id,
      title: title.trim(),
      body: body.trim(),
      category,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Bedankt! Je verhaal is ingestuurd. We lezen het en plaatsen het anoniem.");
    navigate({ to: "/ontdekken" });
  }

  return (
    <div className="space-y-4 pt-2">
      <Link to="/ontdekken" className="text-sm text-primary underline">Terug naar Ontdekken</Link>
      <h1 className="text-3xl">Deel jouw verhaal</h1>
      <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
        <p className="text-sm text-muted-foreground">
          Vertel wat jou is overkomen of wat je bezighoudt. Wij lezen je verhaal, maken de zinnen wat vloeiender
          en halen namen en andere herkenbare dingen eruit. Daarna verschijnt het <b>anoniem</b> bij Ontdekken.
        </p>
        <Input placeholder="Titel van je verhaal" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="rounded-2xl" />
        <div className="flex flex-wrap gap-2">
          {ARTICLE_CATEGORIES.map((c) => (
            <Button key={c} variant={category === c ? "default" : "outline"} size="sm" className="rounded-full" onClick={() => setCategory(c)}>
              {categoryLabel(c)}
            </Button>
          ))}
        </div>
        <Textarea
          placeholder="Schrijf hier je verhaal. Het hoeft niet perfect te zijn, wij helpen met de zinnen."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
          className="rounded-2xl"
        />
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
          <span>Ik snap dat mijn verhaal anoniem wordt geplaatst en dat namen en herkenbare gegevens worden weggehaald.</span>
        </label>
        <Button disabled={title.trim().length < 3 || body.trim().length < 20 || !agreed || busy} onClick={submit} className="w-full rounded-full">
          {busy ? "Versturen…" : "Verhaal insturen"}
        </Button>
      </section>
    </div>
  );
}
