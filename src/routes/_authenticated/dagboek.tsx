import { createFileRoute, Link } from "@tanstack/react-router";
import { DrawingPad } from "@/components/DrawingPad";
import { isDrawingChallenge } from "@/lib/drawing";
import { needsCare, showCareHelp } from "@/lib/care";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTodayChallenge } from "@/lib/challenges";
import { useMe } from "@/lib/auth";
import { useSignedImage } from "@/lib/articles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Square } from "lucide-react";
import { recordWav, transcribeAudio } from "@/lib/speech";

export const Route = createFileRoute("/_authenticated/dagboek")({
  head: () => ({
    meta: [
      { title: "Mijn dagboek — CeritaProject" },
      { name: "description", content: "Je privé-dagboek in CeritaProject. Alleen jij kunt dit lezen." },
      { property: "og:title", content: "Mijn dagboek — CeritaProject" },
      { property: "og:description", content: "Je privé-dagboek in CeritaProject. Alleen jij kunt dit lezen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DagboekPage,
});

function DagboekPage() {
  const { data: me } = useMe();
  return <Diary me={me} />;
}

function Diary({ me }: { me: ReturnType<typeof useMe>["data"] }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [audio, setAudio] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: challenge } = useTodayChallenge();

  const { data: entries } = useQuery({
    queryKey: ["diary", me?.profile?.id],
    enabled: !!me?.profile?.id,
    queryFn: async () =>
      (await supabase.from("diary_entries").select("*, challenge:daily_challenges(title)").eq("user_id", me!.profile!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["diary"] });

  async function save(challengeId: string | null) {
    if (!text.trim() && !photo && !audio) return;
    setBusy(true);
    let photo_path: string | null = null;
    if (photo) {
      const ext = photo.name.split(".").pop() || "jpg";
      photo_path = `${me!.profile!.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("diary-photos").upload(photo_path, photo);
      if (upErr) {
        toast.error("Foto uploaden mislukt: " + upErr.message);
        setBusy(false);
        return;
      }
    }
    let audio_path: string | null = null;
    if (audio) {
      audio_path = `${me!.profile!.id}/${crypto.randomUUID()}.wav`;
      const { error: auErr } = await supabase.storage.from("diary-audio").upload(audio_path, audio);
      if (auErr) {
        toast.error("Spraakmemo uploaden mislukt: " + auErr.message);
        setBusy(false);
        return;
      }
    }
    const { error } = await supabase.from("diary_entries").insert({ user_id: me!.profile!.id, challenge_id: challengeId, body: text.trim() || null, photo_path, audio_path });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Opgeslagen in je dagboek");
    // Your diary stays private (no admin sees it), but you do get the help numbers.
    if (needsCare(text)) showCareHelp();
    setText("");
    setPhoto(null);
    setAudio(null);
    refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Deze dagboekpagina verwijderen?")) return;
    const { error } = await supabase.from("diary_entries").delete().eq("id", id);
    if (error) toast.error(error.message);
    refresh();
  }

  return (
    <div className="space-y-5 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">Mijn dagboek</h1>
        <span className="text-xs text-muted-foreground">🔒 Alleen voor jou</span>
      </div>
      <Link to="/brieven" className="flex items-center gap-3 rounded-3xl bg-card p-4 shadow-soft">
        <span className="text-2xl">💌</span>
        <span className="flex-1">
          <span className="block text-sm font-semibold">Brief aan jezelf</span>
          <span className="block text-xs text-muted-foreground">Schrijf iets dat je pas over een paar maanden mag lezen</span>
        </span>
        <span className="text-primary">→</span>
      </Link>

      {challenge && (
        <section className="rounded-3xl bg-warm p-5 text-blush shadow-soft">
          <p className="text-xs uppercase tracking-widest opacity-75">Opdracht van de dag</p>
          <p className="mt-2 font-display text-xl">{challenge.title}</p>
          {challenge.description && <p className="mt-1 text-sm opacity-85">{challenge.description}</p>}
          {isDrawingChallenge(challenge.title) && (
            <button onClick={() => setDrawing(true)} className="mt-3 rounded-full bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-soft active:scale-95">
              🎨 Teken hier
            </button>
          )}
        </section>
      )}

      <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
        <h2 className="text-lg">{challenge ? "Doe de opdracht of schrijf vrij" : "Schrijf over alles en nog wat"}</h2>
        <Textarea
          placeholder="Waar denk je vandaag aan? Niemand leest mee."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className="rounded-2xl"
        />
        <MicButton onText={(t) => setText((prev) => (prev.trim() ? `${prev.trim()} ${t}` : t))} />
        <MemoButton onAudio={setAudio} />
        {audio && (
          <div className="flex items-center justify-between rounded-full bg-secondary px-4 py-2 text-sm text-secondary-foreground">
            <span>🎙️ Spraakmemo klaar ({Math.round(audio.size / 1024)} kb)</span>
            <button className="text-xs underline" onClick={() => setAudio(null)}>Weg</button>
          </div>
        )}
        {photo ? (
          <PhotoPreview file={photo} onRemove={() => setPhoto(null)} onDrawMore={photo.name === "tekening.png" ? () => setDrawing(true) : undefined} />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDrawing(true)}
              className={`flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold ${challenge && isDrawingChallenge(challenge.title) ? "bg-primary text-primary-foreground" : "border border-dashed border-muted-foreground/40 text-muted-foreground"}`}
            >
              🎨 Tekenen
            </button>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-full border border-dashed border-muted-foreground/40 px-4 py-2.5 text-sm text-muted-foreground">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
              📷 Foto
            </label>
          </div>
        )}
        <DrawingPad
          open={drawing}
          title={challenge && isDrawingChallenge(challenge.title) ? challenge.title : undefined}
          start={photo?.name === "tekening.png" ? photo : null}
          onClose={() => setDrawing(false)}
          onDone={(file) => {
            setPhoto(file);
            setDrawing(false);
          }}
        />
        <div className="flex gap-2">
          {challenge && (
            <Button disabled={busy || (!text.trim() && !photo && !audio)} onClick={() => save(challenge.id)} className="flex-1 rounded-full">
              {busy ? "Bezig…" : "Opslaan bij opdracht"}
            </Button>
          )}
          <Button disabled={busy || (!text.trim() && !photo && !audio)} variant={challenge ? "outline" : "default"} onClick={() => save(null)} className="flex-1 rounded-full">
            {busy ? "Bezig…" : "Opslaan"}
          </Button>
        </div>
      </section>


      <section className="space-y-3">
        <h2 className="text-lg">Eerdere pagina's</h2>
        {entries?.map((e) => (
          <DiaryEntry key={e.id} entry={e} onDelete={() => remove(e.id)} />
        ))}
        {entries?.length === 0 && <p className="text-sm text-muted-foreground">Nog leeg. Schrijf je eerste pagina hierboven.</p>}
      </section>
    </div>
  );
}

function MicButton({ onText }: { onText: (t: string) => void }) {
  const [rec, setRec] = useState<{ stop: () => Promise<File> } | null>(null);
  const [busy, setBusy] = useState(false);

  async function start() {
    try {
      setRec(await recordWav());
    } catch {
      toast.error("Geen toegang tot je microfoon. Sta dat toe in je browser.");
    }
  }
  async function stop() {
    if (!rec) return;
    setBusy(true);
    try {
      const file = await rec.stop();
      const t = await transcribeAudio(file);
      if (t.trim()) onText(t.trim());
      else toast.error("Ik kon niets verstaan. Spreek iets langer en duidelijk in, en probeer het opnieuw.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Omzetten mislukt");
    } finally {
      setBusy(false);
      setRec(null);
    }
  }

  if (rec) {
    return (
      <Button type="button" variant="destructive" onClick={stop} disabled={busy} className="w-full rounded-full">
        <Square className="size-4" /> {busy ? "Bezig met omzetten…" : "Stop opname (spreek rustig een paar seconden)"}
      </Button>
    );
  }
  return (
    <Button type="button" variant="outline" onClick={start} className="w-full rounded-full">
      <Mic className="size-4" /> Spreek in plaats van typen
    </Button>
  );
}

/** Neem een spraakmemo op die als memo (niet als tekst) in het dagboek komt. */
function MemoButton({ onAudio }: { onAudio: (f: File) => void }) {
  const [rec, setRec] = useState<{ stop: () => Promise<File> } | null>(null);

  async function start() {
    try {
      setRec(await recordWav());
    } catch {
      toast.error("Geen toegang tot je microfoon. Sta dat toe in je browser.");
    }
  }
  async function stop() {
    if (!rec) return;
    try {
      const file = await rec.stop();
      onAudio(file);
      toast.success("Spraakmemo toegevoegd");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Opnemen mislukt");
    } finally {
      setRec(null);
    }
  }

  if (rec) {
    return (
      <Button type="button" variant="destructive" onClick={stop} className="w-full rounded-full">
        <Square className="size-4" /> Stop spraakmemo
      </Button>
    );
  }
  return (
    <Button type="button" variant="outline" onClick={start} className="w-full rounded-full">
      <Mic className="size-4" /> Spraakmemo opnemen (blijft geluid)
    </Button>
  );
}

function DiaryEntry({ entry, onDelete }: {
  entry: { id: string; body: string | null; photo_path: string | null; audio_path: string | null; created_at: string; challenge: { title: string } | null };
  onDelete: () => void;
}) {
  const { data: src } = useSignedImage("diary-photos", entry.photo_path);
  const { data: audioSrc } = useSignedImage("diary-audio", entry.audio_path);
  const date = new Date(entry.created_at);
  return (
    <article className="diary-page overflow-hidden rounded-2xl border-2 border-ink/80 shadow-soft">
      <header className="flex items-center justify-between border-b-2 border-dashed border-ink/30 px-4 py-2.5 pl-11">
        <p className="font-hand text-xl font-semibold">
          {date.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
        <button className="text-xs text-destructive underline" onClick={onDelete}>Weg</button>
      </header>
      <div className="space-y-1 px-4 py-3 pl-11">
        {entry.challenge && (
          <p className="mb-2 inline-block rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">Opdracht: {entry.challenge.title}</p>
        )}
        {entry.body && <p className="font-hand whitespace-pre-wrap text-2xl leading-8">{entry.body}</p>}
        {audioSrc && (
          <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-2">
            <span className="text-lg">🎙️</span>
            <audio controls src={audioSrc} className="h-8 w-full min-w-0" />
          </div>
        )}
        {src && <img src={src} alt="" className="mt-2 w-full rounded-xl border border-ink/20 object-cover" />}
        <p className="pt-1 text-right text-[11px] text-muted-foreground">{date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}</p>
      </div>
    </article>
  );
}

/** Small preview of the photo or drawing that will be saved, with "remove" and for drawings "draw more". */
function PhotoPreview({ file, onRemove, onDrawMore }: { file: File; onRemove: () => void; onDrawMore?: (() => void) | undefined }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-muted p-2">
      {url && <img src={url} alt="" className="size-16 rounded-xl bg-white object-cover" />}
      <span className="min-w-0 flex-1 truncate text-sm">{file.name === "tekening.png" ? "🎨 Jouw tekening" : `📷 ${file.name}`}</span>
      {onDrawMore && (
        <button className="text-xs font-semibold text-primary underline" onClick={onDrawMore}>
          Verder tekenen
        </button>
      )}
      <button className="text-xs underline" onClick={onRemove}>
        Weg
      </button>
    </div>
  );
}
