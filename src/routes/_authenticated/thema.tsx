import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { useSignedImage } from "@/lib/articles";
import { useThemeOfMonth } from "@/lib/use-theme-month";
import { DrawingPad } from "@/components/DrawingPad";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { needsCare, showCareHelp } from "@/lib/care";

export const Route = createFileRoute("/_authenticated/thema")({
  head: () => ({
    meta: [
      { title: "Thema van de maand — CeritaProject" },
      {
        name: "description",
        content: "Doe mee met het thema van de maand: stuur een verhaal, tekening of foto in.",
      },
    ],
  }),
  component: ThemePage,
});

const KINDS = [
  { id: "verhaal", emoji: "✍️", label: "Verhaal" },
  { id: "tekening", emoji: "🎨", label: "Tekening" },
  { id: "foto", emoji: "📷", label: "Foto" },
] as const;
type Kind = (typeof KINDS)[number]["id"];
const STATUS: Record<string, string> = {
  nieuw: "⏳ Wordt bekeken",
  gekozen: "🌟 Gekozen!",
  afgewezen: "Niet gekozen deze keer",
};

function EntryImage({ path }: { path: string }) {
  const { data: src } = useSignedImage("theme-entries", path);
  return src ? (
    <img src={src} alt="" className="w-full rounded-2xl object-cover" />
  ) : (
    <div className="h-40 rounded-2xl bg-muted" />
  );
}

/** The theme of the month: send a story, drawing or photo; the chosen ones are shown to your age band. */
function ThemePage() {
  const { data: me } = useMe();
  const uid = me?.user.id;
  const qc = useQueryClient();
  const { data: theme, isLoading } = useThemeOfMonth();
  const [kind, setKind] = useState<Kind>("verhaal");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [showName, setShowName] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ["theme-entries", theme?.id, uid],
    enabled: !!theme && !!uid,
    queryFn: async () => {
      const [mine, show] = await Promise.all([
        supabase
          .from("theme_entries")
          .select("id, kind, body, image_path, status, created_at")
          .eq("theme_id", theme!.id)
          .eq("user_id", uid!),
        supabase.rpc("theme_showcase", { _theme: theme!.id }),
      ]);
      return { mine: mine.data ?? [], showcase: show.data ?? [] };
    },
  });

  async function send() {
    if (!uid || !theme || !me?.profile) return;
    setBusy(true);
    let path: string | null = null;
    try {
      if (kind !== "verhaal") {
        if (!file)
          throw new Error(kind === "tekening" ? "Maak eerst je tekening." : "Kies eerst een foto.");
        if (file.size > 10 * 1024 * 1024) throw new Error("Deze foto is te groot (max. 10 MB).");
        const ext = file.type === "image/png" ? "png" : "jpg";
        path = `${uid}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("theme-entries")
          .upload(path, file, { contentType: file.type });
        if (error) throw new Error("Uploaden lukte niet.");
      }
      const { error } = await supabase.from("theme_entries").insert({
        theme_id: theme.id,
        user_id: uid,
        age_group: me.profile.age_group,
        kind,
        body: body.trim() || null,
        image_path: path,
        show_name: showName,
      });
      if (error)
        throw new Error(
          error.message.includes("3 inzendingen")
            ? "Je hebt al 3 inzendingen voor dit thema."
            : "Insturen lukte niet.",
        );
      if (needsCare(body)) showCareHelp();
      toast.success("Ingestuurd! De beheerders kijken ernaar. 🌟");
      setBody("");
      setFile(null);
      qc.invalidateQueries({ queryKey: ["theme-entries"] });
    } catch (e) {
      if (path) await supabase.storage.from("theme-entries").remove([path]);
      toast.error(e instanceof Error ? e.message : "Insturen lukte niet.");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <p className="pt-6 text-sm text-muted-foreground">Laden…</p>;
  if (!theme)
    return (
      <div className="space-y-2 pt-6 text-center">
        <p className="text-4xl">✨</p>
        <p className="font-semibold">Er is deze maand (nog) geen thema.</p>
        <p className="text-sm text-muted-foreground">Kijk binnenkort nog eens!</p>
      </div>
    );

  const ready = kind === "verhaal" ? body.trim().length >= 10 : !!file;
  return (
    <div className="space-y-4 pt-2">
      <div className="rounded-3xl bg-warm p-5 text-blush shadow-soft">
        <p className="text-xs uppercase tracking-widest opacity-75">Thema van de maand</p>
        <p className="mt-1 font-display text-3xl">
          {theme.emoji} {theme.title}
        </p>
        {theme.description && <p className="mt-2 text-sm opacity-90">{theme.description}</p>}
      </div>

      <section className="space-y-3 rounded-3xl bg-card p-4 shadow-soft">
        <p className="font-semibold">Doe mee!</p>
        <div className="grid grid-cols-3 gap-2">
          {KINDS.map((k) => (
            <Button
              key={k.id}
              variant={kind === k.id ? "default" : "outline"}
              className="rounded-full"
              onClick={() => {
                setKind(k.id);
                setFile(null);
              }}
            >
              {k.emoji} {k.label}
            </Button>
          ))}
        </div>
        {kind === "tekening" && (
          <Button variant="outline" className="w-full rounded-2xl" onClick={() => setDrawing(true)}>
            {file ? "🎨 Tekening klaar ✓ (tik om aan te passen)" : "🎨 Begin met tekenen"}
          </Button>
        )}
        {kind === "foto" && (
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 p-4 text-sm font-semibold">
            📷 {file ? file.name : "Kies een foto"}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        )}
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={3000}
          rows={kind === "verhaal" ? 6 : 2}
          placeholder={
            kind === "verhaal" ? "Schrijf je verhaal…" : "Iets over je tekening of foto? (mag leeg)"
          }
          className="rounded-2xl"
        />
        <label className="flex items-center justify-between gap-3 text-sm">
          Mijn naam erbij als hij gekozen wordt
          <Switch checked={showName} onCheckedChange={setShowName} />
        </label>
        <p className="text-[11px] text-muted-foreground">
          Gekozen inzendingen zien alleen leden van jouw leeftijd. Zet geen gezichten van anderen of
          je adres op een foto.
        </p>
        <Button disabled={busy || !ready} onClick={send} className="h-12 w-full rounded-full">
          {busy ? "Even geduld…" : "🌟 Insturen"}
        </Button>
      </section>

      {!!data?.mine.length && (
        <section className="space-y-2">
          <h2 className="text-lg">Mijn inzendingen</h2>
          {data.mine.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-3 rounded-2xl bg-card p-3 text-sm shadow-soft"
            >
              <span className="text-xl">{KINDS.find((k) => k.id === e.kind)?.emoji}</span>
              <span className="min-w-0 flex-1 truncate">
                {e.body || (e.kind === "tekening" ? "Tekening" : "Foto")}
              </span>
              <span className="shrink-0 text-xs">{STATUS[e.status]}</span>
            </div>
          ))}
        </section>
      )}

      {!!data?.showcase.length && (
        <section className="space-y-3">
          <h2 className="text-lg">🌟 Gekozen inzendingen</h2>
          {data.showcase.map((e) => (
            <article key={e.id} className="space-y-2 rounded-3xl bg-card p-4 shadow-soft">
              {e.image_path && <EntryImage path={e.image_path} />}
              {e.body && <p className="whitespace-pre-wrap text-sm">{e.body}</p>}
              <p className="text-xs text-muted-foreground">
                {e.maker ? `Door ${e.maker}` : "Anoniem ingestuurd"}
              </p>
            </article>
          ))}
        </section>
      )}

      <DrawingPad
        open={drawing}
        title={`🎨 ${theme.title}`}
        start={kind === "tekening" ? file : null}
        onClose={() => setDrawing(false)}
        onDone={(f) => {
          setFile(f);
          setDrawing(false);
        }}
      />
    </div>
  );
}
