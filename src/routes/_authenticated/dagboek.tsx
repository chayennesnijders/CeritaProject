import { createFileRoute, Link } from "@tanstack/react-router";
import { shrinkImage } from "@/lib/shrink-image";
import { challengeDay } from "@/lib/challenges";
import { useConfirm } from "@/components/ConfirmDialog";
import { DrawingPad } from "@/components/DrawingPad";
import { isDrawingChallenge } from "@/lib/drawing";
import { needsCare, showCareHelp } from "@/lib/care";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTodayChallenge } from "@/lib/challenges";
import { useMe } from "@/lib/auth";
import { useActsAsParent } from "@/lib/parent-view";
import { parentDay } from "@/lib/parent";
import { teacherDay } from "@/lib/teacher";
import { useActsAsTeacher } from "@/lib/teacher-view";
import { countdownFor } from "@/lib/countdown";
import { useChallengeDay } from "@/lib/challenges";
import { useSignedImage } from "@/lib/articles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const { confirm: askConfirm, dialog: confirmDialog } = useConfirm();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [audio, setAudio] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: challenge } = useTodayChallenge();
  const day = useChallengeDay();

  const { data: entries } = useQuery({
    queryKey: ["diary", me?.profile?.id],
    enabled: !!me?.profile?.id,
    queryFn: async () =>
      (await supabase.from("diary_entries").select("*, challenge:daily_challenges(title)").eq("user_id", me!.profile!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["diary"] });
    // Riti on the home screen stops saying "Je opdracht van vandaag staat klaar".
    void qc.invalidateQueries({ queryKey: ["challenge-done"] });
  };

  async function save(challengeId: string | null) {
    if (!text.trim() && !photo && !audio) return;
    setBusy(true);
    let photo_path: string | null = null;
    if (photo) {
      const small = await shrinkImage(photo);
      const ext = small.name.split(".").pop() || "jpg";
      photo_path = `${me!.profile!.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("diary-photos").upload(photo_path, small, { contentType: small.type });
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
    if (!(await askConfirm("Deze dagboekpagina verwijderen?", "Verwijderen"))) return;
    const { error } = await supabase.from("diary_entries").delete().eq("id", id);
    if (error) toast.error(error.message);
    refresh();
  }

  const asParent = useActsAsParent();
  const isTeacher = useActsAsTeacher();
  // Teachers get a question about their day in class; parents their own assignment.
  const prompt = isTeacher ? teacherDay(day).reflect : asParent ? parentDay(day).self : null;
  // Young people also get the countdown question of the day (the same one as on TikTok that morning).
  const countdown = prompt ? null : countdownFor(day);
  const name = me?.profile?.display_name ?? "";
  const todayLabel = new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
  const canSave = !busy && !!(text.trim() || photo || audio);

  return (
    <>
      {confirmDialog}
      <div className="space-y-6 pt-2">
        {/* De kaft */}
        <section className="diary-cover relative overflow-hidden rounded-[1.75rem] px-6 pb-6 pt-5 text-[#2b1420]">
          <span className="diary-band" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">🔒 Alleen voor jou</p>
          <h1 className="mt-1 font-hand text-5xl leading-none">Dagboek{name ? ` van ${name}` : ""}</h1>
          <p className="mt-2 font-hand text-xl opacity-80">
            {entries?.length ? `${entries.length} ${entries.length === 1 ? "pagina" : "pagina's"} vol` : "Nog helemaal leeg en van jou"}
          </p>
          <img src="/riti/blij.webp" alt="" className="pointer-events-none absolute -bottom-3 right-12 w-24 rotate-6 drop-shadow" />
        </section>

        {/* Opdracht (jongeren) of zinnetje voor jezelf (ouders) als geeltje */}
        {(prompt || challenge) && (
          <section className="post-it relative mx-2 rounded-sm px-5 pb-4 pt-6">
            <span className="washi" aria-hidden />
            <p className="font-hand text-lg opacity-70">{prompt ? "Iets voor jou vandaag" : "Opdracht van de dag"}</p>
            <p className="font-hand text-2xl leading-7">{prompt ?? challenge?.title}</p>
            {!prompt && challenge?.description && <p className="mt-1 text-sm opacity-80">{challenge.description}</p>}
            {!prompt && challenge && isDrawingChallenge(challenge.title) && (
              <button onClick={() => setDrawing(true)} className="mt-3 rounded-full bg-white/70 px-4 py-1.5 text-sm font-semibold shadow-soft active:scale-95">
                🎨 Teken hier
              </button>
            )}
          </section>
        )}

        {countdown && (
          <section className="mx-2 space-y-2 rounded-3xl bg-ink p-4 text-ink-foreground shadow-soft">
            <p className="text-xs font-bold uppercase tracking-wider opacity-70">
              {countdown.emoji} {countdown.headline} · vraag {countdown.day} van {countdown.total}
            </p>
            <p className="font-hand text-2xl leading-7">{countdown.question}</p>
            <button
              onClick={() => {
                if (!text.includes(countdown.question)) setText((t) => `${countdown.question}\n${t}`);
                document.getElementById("diary-text")?.focus();
              }}
              className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground active:scale-95"
            >
              ✍️ Beantwoorden in mijn dagboek
            </button>
          </section>
        )}

        {/* De pagina van vandaag */}
        <section className="diary-sheet diary-spiral rounded-r-2xl rounded-l-md pb-4 pl-14 pr-4 pt-3">
          <p className="font-hand text-2xl leading-8 first-letter:uppercase">{todayLabel}</p>
          <label htmlFor="diary-text" className="sr-only">Wat wil je vandaag opschrijven?</label>
          <textarea
            id="diary-text"
            ref={(el) => {
              if (!el) return;
              // Grow with the text in whole lines, so it never scrolls inside and stays on the ruled lines.
              el.style.height = "auto";
              el.style.height = `${Math.max(256, Math.ceil(el.scrollHeight / 32) * 32)}px`;
            }}
            placeholder={isTeacher ? "Hoe was je dag in de klas? Niemand leest mee…" : asParent ? "Hoe gaat het met jóu vandaag? Niemand leest mee…" : "Lief dagboek… Niemand leest mee."}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.max(256, Math.ceil(el.scrollHeight / 32) * 32)}px`;
            }}
            rows={8}
            className="block w-full resize-none overflow-hidden border-0 bg-transparent p-0 font-hand text-2xl leading-8 text-inherit outline-none placeholder:text-[oklch(0.6_0.03_40)] focus-visible:ring-0"
          />
          {audio && (
            <div className="mt-2 flex items-center justify-between rounded-full bg-[oklch(0.93_0.03_80)] px-4 py-1.5 text-sm">
              <span>🎙️ Spraakmemo klaar ({Math.round(audio.size / 1024)} kb)</span>
              <button className="text-xs underline" onClick={() => setAudio(null)}>Weg</button>
            </div>
          )}
          {photo && (
            <div className="mt-3">
              <PhotoPreview file={photo} onRemove={() => setPhoto(null)} onDrawMore={photo.name === "tekening.png" ? () => setDrawing(true) : undefined} />
            </div>
          )}
        </section>

        {/* Gereedschap als stickers */}
        <div className="flex flex-wrap justify-center gap-2">
          <MicButton onText={(t) => setText((prev) => (prev.trim() ? `${prev.trim()} ${t}` : t))} />
          <MemoButton onAudio={setAudio} />
          {!photo && (
            <>
              <button
                onClick={() => setDrawing(true)}
                style={{ ["--r" as string]: "2deg" }}
                className={`diary-tool rounded-full px-4 py-2 text-sm font-semibold shadow-soft ${!prompt && challenge && isDrawingChallenge(challenge.title) ? "bg-primary text-primary-foreground" : "bg-card"}`}
              >
                🎨 Tekenen
              </button>
              <label style={{ ["--r" as string]: "-3deg" }} className="diary-tool cursor-pointer rounded-full bg-card px-4 py-2 text-sm font-semibold shadow-soft">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
                📷 Foto
              </label>
            </>
          )}
        </div>
        <DrawingPad
          open={drawing}
          title={!prompt && challenge && isDrawingChallenge(challenge.title) ? challenge.title : undefined}
          start={photo?.name === "tekening.png" ? photo : null}
          onClose={() => setDrawing(false)}
          onDone={(file) => {
            setPhoto(file);
            setDrawing(false);
          }}
        />
        <div className="flex gap-2">
          {challenge && !prompt && (
            <Button disabled={!canSave} onClick={() => save(challenge.id)} className="flex-1 rounded-full">
              {busy ? "Bezig…" : "Opslaan bij opdracht"}
            </Button>
          )}
          <Button disabled={!canSave} variant={challenge && !prompt ? "outline" : "default"} onClick={() => save(null)} className="flex-1 rounded-full">
            {busy ? "Bezig…" : "Bewaar deze pagina"}
          </Button>
        </div>

        <Link to="/brieven" className="flex items-center gap-3 rounded-3xl bg-card p-4 shadow-soft">
          <span className="text-2xl">💌</span>
          <span className="flex-1">
            <span className="block text-sm font-semibold">Brief aan jezelf</span>
            <span className="block text-xs text-muted-foreground">Schrijf iets dat je pas over een paar maanden mag lezen</span>
          </span>
          <span className="text-primary">→</span>
        </Link>

        <DiaryBook entries={entries ?? []} onDelete={remove} />
      </div>
    </>
  );
}

type Entry = { id: string; body: string | null; photo_path: string | null; audio_path: string | null; created_at: string; challenge: { title: string } | null };

/** Earlier pages, read one at a time like a book: arrows or swipe to turn the page, a list to jump. */
function DiaryBook({ entries, onDelete }: { entries: Entry[]; onDelete: (id: string) => void }) {
  const [i, setI] = useState(0); // 0 = newest page
  const [dir, setDir] = useState<"next" | "prev">("next");
  const [toc, setToc] = useState(false);
  const [touchX, setTouchX] = useState<number | null>(null);
  useEffect(() => {
    if (i > 0 && i >= entries.length) setI(Math.max(0, entries.length - 1));
  }, [entries.length, i]);
  if (entries.length === 0)
    return <p className="text-center font-hand text-2xl text-muted-foreground">Je eerste pagina komt hier te staan.</p>;
  const n = entries.length;
  const go = (to: number) => {
    if (to < 0 || to >= n) return;
    setDir(to > i ? "prev" : "next");
    setI(to);
  };
  const entry = entries[Math.min(i, n - 1)]!;
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-hand text-3xl">Eerdere pagina's</h2>
        <button onClick={() => setToc((v) => !v)} className="text-sm font-semibold text-primary underline">
          {toc ? "Sluit inhoud" : "Inhoud"}
        </button>
      </div>
      {toc && (
        <ol className="diary-sheet max-h-72 space-y-0 overflow-y-auto rounded-xl pb-3 pl-14 pr-4 pt-3">
          {entries.map((e, k) => (
            <li key={e.id}>
              <button onClick={() => { go(k); setToc(false); }} className={`flex w-full justify-between font-hand text-xl leading-8 ${k === i ? "font-bold" : ""}`}>
                <span className="first-letter:uppercase">{new Date(e.created_at).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "long" })}</span>
                <span className="opacity-60">p. {n - k}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
      <div
        className="relative"
        onTouchStart={(e) => setTouchX(e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          const end = e.changedTouches[0]?.clientX;
          if (touchX !== null && end !== undefined && Math.abs(end - touchX) > 50) go(end < touchX ? i - 1 : i + 1);
          setTouchX(null);
        }}
      >
        <span className="diary-ribbon z-10" aria-hidden />
        <div key={entry.id} className={dir === "next" ? "page-next" : "page-prev"}>
          <DiaryEntry entry={entry} page={n - i} onDelete={() => onDelete(entry.id)} />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <button onClick={() => go(i + 1)} disabled={i >= n - 1} className="rounded-full bg-card px-4 py-2 text-sm font-semibold shadow-soft disabled:opacity-40">
          ← Eerder
        </button>
        <span className="font-hand text-xl">pagina {n - i} van {n}</span>
        <button onClick={() => go(i - 1)} disabled={i <= 0} className="rounded-full bg-card px-4 py-2 text-sm font-semibold shadow-soft disabled:opacity-40">
          Later →
        </button>
      </div>
    </section>
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
      <Button type="button" variant="destructive" onClick={stop} disabled={busy} className="rounded-full">
        <Square className="size-4" /> {busy ? "Omzetten…" : "Stop opname"}
      </Button>
    );
  }
  return (
    <button type="button" onClick={start} style={{ ["--r" as string]: "-2deg" }} className="diary-tool inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-sm font-semibold shadow-soft">
      <Mic className="size-4" /> Inspreken
    </button>
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
      <Button type="button" variant="destructive" onClick={stop} className="rounded-full">
        <Square className="size-4" /> Stop memo
      </Button>
    );
  }
  return (
    <button type="button" onClick={start} style={{ ["--r" as string]: "3deg" }} className="diary-tool inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-sm font-semibold shadow-soft">
      🔴 Spraakmemo
    </button>
  );
}

function DiaryEntry({ entry, page, onDelete }: { entry: Entry; page: number; onDelete: () => void }) {
  const { data: src } = useSignedImage("diary-photos", entry.photo_path);
  const { data: audioSrc } = useSignedImage("diary-audio", entry.audio_path);
  const date = new Date(entry.created_at);
  return (
    <article className="diary-sheet diary-spiral min-h-[22rem] rounded-r-2xl rounded-l-md pb-4 pl-14 pr-4 pt-3">
      <header className="flex items-baseline justify-between gap-2 pr-6">
        <p className="font-hand text-2xl font-semibold leading-8 first-letter:uppercase">
          {date.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
        <span className="shrink-0 font-hand text-lg opacity-60">{date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}</span>
      </header>
      {entry.challenge && (
        <p className="post-it inline-block max-w-full truncate rounded-sm px-3 py-1 font-hand text-lg leading-6">📌 {entry.challenge.title}</p>
      )}
      {entry.body && <p className="whitespace-pre-wrap font-hand text-2xl leading-8">{entry.body}</p>}
      {audioSrc && (
        <div className="flex h-16 items-center">
          <div className="flex w-full items-center gap-2 rounded-full bg-[oklch(0.93_0.03_80)] px-3">
            <span className="text-lg">🎙️</span>
            <audio controls src={audioSrc} className="h-8 w-full min-w-0" />
          </div>
        </div>
      )}
      {src && (
        <figure className="polaroid relative mx-auto mt-4 w-4/5">
          <span className="washi" aria-hidden />
          <img src={src} alt="" className="w-full object-cover" />
        </figure>
      )}
      <footer className="mt-4 flex items-center justify-between">
        <button className="text-xs text-destructive underline" onClick={onDelete}>Pagina eruit scheuren</button>
        <span className="font-hand text-lg opacity-60">— {page} —</span>
      </footer>
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
