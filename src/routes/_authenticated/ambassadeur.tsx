import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { challengeDay } from "@/lib/challenges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { QrCode, downloadQrPng } from "@/components/QrCode";
import { shrinkImage } from "@/lib/shrink-image";
import { useSignedImage } from "@/lib/articles";
import {
  AMBASSADOR_MIN_AGE,
  AMBASSADOR_RULES,
  OFFLINE_RULES,
  HALL_OF_FAME_MIN,
  isCurrentTask,
  isSubmissionUrl,
  LEVELS,
  levelFor,
  nextLevel,
  POINT_RULES,
  WAYS,
  referralLink,
  type SubmissionKind,
  WELCOME,
  totalPoints,
} from "@/lib/ambassador";

export const Route = createFileRoute("/_authenticated/ambassadeur")({
  head: () => ({ meta: [{ title: "Ambassadeur — CeritaProject" }] }),
  component: AmbassadorPage,
});

type Stats = {
  code: string;
  active: boolean;
  agreed_at: string | null;
  since: string;
  signups: number;
  active_week?: number;
  recruits?: number;
  recruits_started?: number;
  task_points: number;
  approved: number;
  pending: number;
  hall_of_fame?: boolean;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  ingediend: { label: "⏳ Wordt bekeken", cls: "bg-muted text-muted-foreground" },
  goedgekeurd: { label: "✅ Goedgekeurd", cls: "bg-emerald-100 text-emerald-800" },
  afgewezen: { label: "Niet goedgekeurd", cls: "bg-rose-100 text-rose-800" },
};

const PREVIEW_NOTE = "Dit is een voorbeeld: hier wordt niks opgeslagen.";
const PREVIEW_STATS: Stats = {
  code: "voorbeeld",
  active: true,
  agreed_at: "2026-11-10T10:00:00Z",
  since: "2026-11-10T10:00:00Z",
  signups: 6,
  active_week: 3,
  recruits: 1,
  recruits_started: 1,
  task_points: 0,
  approved: 2,
  pending: 1,
  hall_of_fame: false,
};

/** The Cerita Ambassadors portal: your link, numbers, assignments, points, rewards and your details. */
function AmbassadorPage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const uid = me?.user.id;

  const { data: myStats, isLoading } = useQuery({
    queryKey: ["ambassador-stats", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_ambassador_stats");
      if (error) throw error;
      return (data as Stats | null) ?? null;
    },
  });
  // Admins who are no ambassador themselves see the portal with example numbers (nothing is saved).
  const preview = !myStats?.active && !!me?.isAdmin;
  const shown: Stats | null = preview ? PREVIEW_STATS : (myStats ?? null);
  const isAmb = !!shown?.active;
  const agreed = !!shown?.agreed_at;

  const { data: work } = useQuery({
    queryKey: ["ambassador-work", uid],
    enabled: !!uid && isAmb,
    queryFn: async () => {
      const [t, s] = await Promise.all([
        supabase.from("ambassador_tasks").select("*").eq("active", true).order("starts", { ascending: true }),
        // In the preview the real assignments show (admins may read them), but no submissions.
        preview
          ? Promise.resolve({ data: [] as Sub[], error: null })
          : supabase.from("ambassador_submissions").select("*").eq("user_id", uid!).order("created_at", { ascending: false }).limit(30),
      ]);
      if (t.error) throw t.error;
      if (s.error) throw s.error;
      // Only this week's assignments (admins in the preview may read every planned one).
      const today = challengeDay();
      return { tasks: (t.data ?? []).filter((x) => isCurrentTask(x, today)), subs: s.data ?? [] };
    },
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["ambassador-stats", uid] });
    void qc.invalidateQueries({ queryKey: ["ambassador-work", uid] });
  };

  const agree = useMutation({
    mutationFn: async () => {
      if (preview) throw new Error(PREVIEW_NOTE);
      const { error } = await supabase.rpc("agree_ambassador_terms");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Welkom, ambassadeur! 💖");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const hall = useMutation({
    mutationFn: async (on: boolean) => {
      if (preview) throw new Error(PREVIEW_NOTE);
      const { error } = await supabase.rpc("set_hall_of_fame", { _on: on });
      if (error) throw error;
      return on;
    },
    onSuccess: (on) => {
      toast.success(on ? "Je staat in de Hall of Fame zodra je Legend bent 👑" : "Je staat niet in de Hall of Fame");
      refresh();
      void qc.invalidateQueries({ queryKey: ["hall-of-fame"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!me || isLoading) return null;

  if (!isAmb || !shown)
    return (
      <div className="mt-6 space-y-3 rounded-3xl bg-card p-6 text-center shadow-soft">
        <p className="text-4xl">💖</p>
        <h1 className="text-xl">Cerita Ambassadors</h1>
        <p className="text-sm text-muted-foreground">
          Ambassadeurs ({AMBASSADOR_MIN_AGE}+) vertellen op hun socials over CeritaProject, krijgen opdrachten en verdienen
          punten, badges en beloningen. Lijkt het je leuk? Stuur ons een berichtje, dan kijken we samen of het past.
        </p>
        <Link to="/contact" className="inline-block rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Stuur een bericht
        </Link>
      </div>
    );

  const stats = shown;
  const points = totalPoints({
    signups: Number(stats.signups),
    activeWeek: Number(stats.active_week ?? 0),
    recruits: Number(stats.recruits ?? 0),
    recruitsStarted: Number(stats.recruits_started ?? 0),
  });
  const level = levelFor(points);
  const next = nextLevel(points);
  const link = referralLink(stats.code);

  return (
    <div className="space-y-5 pb-8 pt-2">
      {preview && (
        <p className="rounded-2xl border-2 border-dashed border-primary bg-card p-3 text-sm">
          👀 <b>Voorbeeld voor beheerders.</b> Zo ziet een ambassadeur het portaal. De cijfers zijn verzonnen, de opdrachten
          zijn echt. Insturen en schakelaars werken hier niet.
        </p>
      )}
      {/* Hero: who you are and your level */}
      <section className="relative overflow-hidden rounded-3xl bg-primary p-5 text-primary-foreground shadow-soft">
        <span className="absolute -right-6 -top-6 text-8xl opacity-20" aria-hidden>
          {level?.emoji ?? "💖"}
        </span>
        <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Cerita Ambassador</p>
        <h1 className="mt-1 text-2xl">Hoi {me.profile?.display_name ?? "ambassadeur"}!</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary-foreground/20 px-3 py-1 text-sm font-semibold">
            {level ? `${level.emoji} ${level.name}` : "🌱 Op weg naar Starter"}
          </span>
          <span className="rounded-full bg-primary-foreground/20 px-3 py-1 text-sm font-semibold">⭐ {points} punten</span>
        </div>
        {next && (
          <div className="mt-4">
            <div className="h-2.5 overflow-hidden rounded-full bg-primary-foreground/25">
              <div className="h-full rounded-full bg-primary-foreground" style={{ width: `${Math.round(next.progress * 100)}%` }} />
            </div>
            <p className="mt-1.5 text-xs opacity-90">
              Nog {next.missing} {next.missing === 1 ? "punt" : "punten"} tot {next.level.emoji} {next.level.name}
            </p>
          </div>
        )}
      </section>

      {!agreed ? (
        <>
        <Welcome />
        <section className="space-y-3 rounded-3xl border-2 border-primary bg-card p-5 shadow-soft">
          <h2 className="text-lg">Eerst even de afspraken 🤝</h2>
          <p className="text-sm text-muted-foreground">
            Je praat namens een veilige plek voor jongeren. Daarom spreken we dit samen af. Daarna krijg je je eigen link.
          </p>
          <Rules />
          <Button className="w-full rounded-full" disabled={agree.isPending} onClick={() => agree.mutate()}>
            Ik doe mee en houd me hieraan
          </Button>
        </section>
        </>
      ) : (
        <>
          {/* 2. Personal link */}
          <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
            <h2 className="text-lg">🔗 Jouw link</h2>
            <p className="text-sm text-muted-foreground">
              Zet hem in je bio, story of bij je post. Elke aanmelding op de wachtlijst via deze link is 3 punten voor jou.
            </p>
            <div className="break-all rounded-2xl bg-muted px-3 py-2.5 font-mono text-xs">{link}</div>
            <div className="flex gap-2">
              <Button
                className="flex-1 rounded-full"
                onClick={() => void navigator.clipboard?.writeText(link).then(() => toast.success("Link gekopieerd"), () => {})}
              >
                Kopieer link
              </Button>
              {typeof navigator !== "undefined" && "share" in navigator && (
                <Button
                  variant="outline"
                  className="flex-1 rounded-full"
                  onClick={() => void navigator.share({ title: "CeritaProject", text: "Zet je op de wachtlijst van CeritaProject 💌", url: link }).catch(() => {})}
                >
                  Delen
                </Button>
              )}
            </div>
          </section>

          {/* Offline: QR code and flyer */}
          <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
            <h2 className="text-lg">📲 Jouw QR-code</h2>
            <p className="text-sm text-muted-foreground">
              Voor offline: laat hem zien op je scherm, zet hem in je WhatsApp-status of print de flyer. Wie scant, komt via
              jouw link op de wachtlijst.
            </p>
            <div className="mx-auto w-44 rounded-2xl border-4 border-foreground bg-white p-1.5">
              <QrCode text={link} className="block h-auto w-full" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-full" onClick={() => downloadQrPng(link, `cerita-qr-${stats.code}.png`)}>
                Download QR
              </Button>
              <a
                href={preview ? "/flyer" : `/flyer?code=${encodeURIComponent(stats.code)}`}
                target="_blank"
                rel="noopener"
                className="flex flex-1 items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                🖨️ Flyer printen
              </a>
            </div>
            <details className="rounded-2xl bg-muted p-3">
              <summary className="cursor-pointer text-sm font-semibold">Ideeën zonder socials</summary>
              <ul className="mt-2 space-y-1 text-sm">
                <li>🏫 Flyer op je eigen school, mbo, hbo of uni (vraag eerst of het mag)</li>
                <li>📚 Bieb, buurthuis, jongerencentrum of sportclub</li>
                <li>👯 Vertel het aan vrienden, broers, zussen, neven en nichten</li>
                <li>🎓 Kort vertellen bij je studievereniging of club, met je QR erbij</li>
              </ul>
            </details>
          </section>

          {/* 3. Stats */}
          <section className="grid grid-cols-2 gap-3">
            <Stat emoji="⭐" value={points} label="punten totaal" />
            <Stat emoji="📝" value={Number(stats.signups)} label="aanmeldingen en downloads via jou" />
            <Stat emoji="📆" value={Number(stats.active_week ?? 0)} label="daarvan een week actief" />
            <Stat emoji="🤝" value={Number(stats.recruits ?? 0)} label="nieuwe ambassadeurs via jou" />
          </section>

          {/* Bring in other ambassadors */}
          <section className="space-y-2 rounded-3xl bg-card p-5 shadow-soft">
            <h2 className="text-lg">🤝 Ken jij nog een ambassadeur?</h2>
            <p className="text-sm text-muted-foreground">
              Iemand van 18 tot 27 die ook mee wil doen? Laat diegene een account maken via jouw link, of je code{" "}
              <b className="font-mono text-foreground">{stats.code}</b> doorgeven aan ons. Doet diegene mee, dan krijg je 3 punten,
              en 2 extra zodra diegene de eerste aanmelding binnen heeft.
            </p>
          </section>

          {/* 4. Assignments and submissions */}
          <Assignments preview={preview} uid={me.user.id} tasks={work?.tasks ?? []} subs={work?.subs ?? []} onDone={refresh} />
        </>
      )}

      {/* 5. Points and rewards */}
      <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
        <h2 className="text-lg">🎁 Punten en beloningen</h2>
        <ul className="space-y-1.5 text-sm">
          {POINT_RULES.map((r) => (
            <li key={r.label} className="flex items-start gap-2">
              <span>{r.emoji}</span>
              <span className="flex-1">{r.label}</span>
              <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">+{r.points}</span>
            </li>
          ))}
        </ul>
        <div className="rounded-2xl bg-muted p-3 text-sm">
          <p className="font-semibold">Zo krijg je aanmeldingen via jouw link:</p>
          <ul className="mt-1 space-y-1">
            {WAYS.map((w) => (
              <li key={w.label} className="flex gap-2">
                <span>{w.emoji}</span>
                <span>{w.label}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          {LEVELS.map((l) => {
            const got = points >= l.min;
            return (
              <div
                key={l.id}
                className={`rounded-2xl border-2 p-3 text-center ${got ? "border-primary bg-primary/10" : "border-dashed border-muted-foreground/30 opacity-70"}`}
              >
                <p className={`text-3xl ${got ? "" : "grayscale"}`}>{l.emoji}</p>
                <p className="text-sm font-bold">{l.name}</p>
                <p className="text-xs text-muted-foreground">{l.min} punten</p>
                <p className="mt-1 text-xs">{l.reward}</p>
                {got && <p className="mt-1 text-xs font-semibold text-primary">Behaald 🎉</p>}
              </div>
            );
          })}
        </div>
        <p className="rounded-2xl bg-muted p-3 text-xs text-muted-foreground">
          Je punten tellen nu al. De beloningen gaan in zodra de app gelanceerd is. Je hebt nu al toegang tot de webversie.
        </p>
      </section>

      {/* Hall of Fame: only when you say yes */}
      <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
        <h2 className="text-lg">👑 Hall of Fame</h2>
        <p className="text-sm text-muted-foreground">
          Haal je {HALL_OF_FAME_MIN} punten, dan word je Legend. Wil je dan met je naam en profielfoto in de Cerita Hall of Fame
          staan? Dat kies jij, en je kunt het altijd weer uitzetten.
        </p>
        <label className="flex items-center gap-3 rounded-2xl bg-muted p-3 text-sm font-semibold">
          <span className="flex-1">Zet mij in de Hall of Fame</span>
          <Switch checked={!!stats.hall_of_fame} disabled={hall.isPending} onCheckedChange={(v) => hall.mutate(v)} />
        </label>
        <Link to="/hall-of-fame" className="inline-block text-sm font-semibold text-primary underline">
          Bekijk de Hall of Fame →
        </Link>
      </section>

      {/* 6. Your details */}
      <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
        <h2 className="text-lg">🪪 Mijn gegevens</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
          <dt className="text-muted-foreground">Naam</dt>
          <dd>{me.profile?.display_name}</dd>
          <dt className="text-muted-foreground">Gebruikersnaam</dt>
          <dd>@{me.profile?.username ?? "–"}</dd>
          <dt className="text-muted-foreground">Jouw code</dt>
          <dd className="font-mono">{stats.code}</dd>
          <dt className="text-muted-foreground">Ambassadeur sinds</dt>
          <dd>{new Date(stats.since).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}</dd>
          <dt className="text-muted-foreground">Afspraken</dt>
          <dd>{agreed ? `Akkoord op ${new Date(stats.agreed_at!).toLocaleDateString("nl-NL")}` : "Nog niet akkoord"}</dd>
        </dl>
        {agreed && (
          <details className="rounded-2xl bg-muted p-3">
            <summary className="cursor-pointer text-sm font-semibold">Het welkomstbericht en de afspraken nog eens lezen</summary>
            <div className="pt-2">
              <Welcome plain />
            </div>
            <div className="pt-2">
              <Rules />
            </div>
          </details>
        )}
        <p className="text-xs text-muted-foreground">
          Je ziet alleen aantallen, nooit wie zich via jou heeft aangemeld. Een idee voor de app, wil je stoppen of klopt er
          iets niet? Stuur ons een{" "}
          <Link to="/contact" className="underline">
            bericht
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

function Welcome({ plain = false }: { plain?: boolean }) {
  return (
    <section className={plain ? "space-y-2 text-sm" : "space-y-3 rounded-3xl bg-card p-5 text-sm shadow-soft"}>
      {!plain && <h2 className="text-lg">{WELCOME.title}</h2>}
      <p>{WELCOME.intro}</p>
      <ol className="space-y-1.5">
        {WELCOME.steps.map((step, i) => (
          <li key={step} className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <p className="text-muted-foreground">{WELCOME.launch}</p>
      <p className="text-muted-foreground">{WELCOME.contact}</p>
      {!plain && <p className="font-semibold">{WELCOME.signoff}</p>}
    </section>
  );
}

function Rules() {
  const list = (rules: readonly string[]) => (
    <ul className="space-y-1.5 text-sm">
      {rules.map((r) => (
        <li key={r} className="flex gap-2">
          <span className="text-primary">♥</span>
          <span>{r}</span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="space-y-3">
      {list(AMBASSADOR_RULES)}
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Offline (flyers, posters, QR)</p>
      {list(OFFLINE_RULES)}
    </div>
  );
}

function Stat({ emoji, value, label }: { emoji: string; value: number; label: string }) {
  return (
    <div className="rounded-3xl bg-card p-4 shadow-soft">
      <p className="text-xl">{emoji}</p>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

type Task = { id: string; title: string; body: string; points: number; due: string | null };
type Sub = {
  id: string;
  task_id: string | null;
  url: string | null;
  photo_path: string | null;
  note: string;
  status: string;
  points: number;
  created_at: string;
};

function SubPhoto({ path }: { path: string }) {
  const { data: src } = useSignedImage("ambassador-photos", path);
  return src ? <img src={src} alt="Ingestuurde foto" className="size-10 shrink-0 rounded-lg object-cover" /> : null;
}

function Assignments({
  preview,
  uid,
  tasks,
  subs,
  onDone,
}: {
  preview: boolean;
  uid: string;
  tasks: Task[];
  subs: Sub[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [kind, setKind] = useState<SubmissionKind>("link");
  const [photo, setPhoto] = useState<File | null>(null);
  const send = useMutation({
    mutationFn: async (taskId: string | null) => {
      if (preview) throw new Error(PREVIEW_NOTE);
      let photoPath: string | null = null;
      if (kind === "foto" && taskId) {
        if (!photo) throw new Error("Kies eerst een foto.");
        const small = await shrinkImage(photo);
        if (small.size > 10 * 1024 * 1024) throw new Error("Deze foto is te groot (max. 10 MB).");
        photoPath = `${uid}/${crypto.randomUUID()}.${small.type === "image/png" ? "png" : "jpg"}`;
        const up = await supabase.storage.from("ambassador-photos").upload(photoPath, small, { contentType: small.type });
        if (up.error) throw up.error;
      } else if (!isSubmissionUrl(url)) throw new Error("Plak de link naar je post (begint met https://).");
      const { error } = await supabase.from("ambassador_submissions").insert({
        user_id: uid,
        task_id: taskId,
        url: photoPath ? null : url.trim(),
        photo_path: photoPath,
        note: note.trim().slice(0, 300),
      });
      if (error) {
        if (photoPath) void supabase.storage.from("ambassador-photos").remove([photoPath]);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Ingestuurd! We kijken er snel naar 💖");
      setUrl("");
      setPhoto(null);
      setKind("link");
      setNote("");
      setOpen(null);
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const taskName = (id: string | null) => tasks.find((t) => t.id === id)?.title ?? (id ? "Opdracht" : "Losse post");

  const form = (key: string, taskId: string | null) =>
    open === key && (
      <div className="space-y-2 pt-2">
        {taskId && (
          <div className="flex gap-1 rounded-full bg-muted p-1 text-xs font-semibold">
            {(["link", "foto"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`flex-1 rounded-full px-3 py-1.5 ${kind === k ? "bg-card shadow-soft" : "text-muted-foreground"}`}
              >
                {k === "link" ? "🔗 Link naar post" : "📸 Foto (offline)"}
              </button>
            ))}
          </div>
        )}
        {kind === "foto" && taskId ? (
          <>
            <Input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
            <p className="text-xs text-muted-foreground">Bijv. je poster of flyer. Zorg dat er geen herkenbare mensen op staan.</p>
          </>
        ) : (
          <Input placeholder="https://www.tiktok.com/..." value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" />
        )}
        <Input placeholder="Iets erbij vertellen? (mag leeg)" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
        <Button className="w-full rounded-full" disabled={send.isPending} onClick={() => send.mutate(taskId)}>
          Insturen
        </Button>
      </div>
    );

  return (
    <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
      <h2 className="text-lg">🏆 Challenges van deze week</h2>
      <p className="text-sm text-muted-foreground">Ideeën om meer mensen via jouw link te laten aanmelden. Klaar? Stuur het in, dan zien wij wat werkt.</p>
      {tasks.length === 0 && <p className="text-sm text-muted-foreground">Er staan nu geen challenges klaar. Elke maandag komen er nieuwe.</p>}
      {tasks.map((t) => (
        <div key={t.id} className="rounded-2xl border-2 border-primary/30 p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <p className="font-semibold">{t.title}</p>
              {t.body && <p className="text-sm text-muted-foreground">{t.body}</p>}
              {t.due && <p className="mt-1 text-xs text-muted-foreground">Uiterlijk {new Date(t.due).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}</p>}
            </div>
            <span className="shrink-0 text-xl" aria-hidden>🏆</span>
          </div>
          {subs.some((s) => s.task_id === t.id && s.status !== "afgewezen") ? (
            <p className="mt-2 text-xs font-semibold text-primary">✓ Ingestuurd</p>
          ) : (
            open !== t.id && (
              <Button size="sm" variant="outline" className="mt-2 rounded-full" onClick={() => setOpen(t.id)}>
                Klaar? Stuur het in
              </Button>
            )
          )}
          {form(t.id, t.id)}
        </div>
      ))}
      <div className="rounded-2xl bg-muted p-3">
        <p className="text-sm font-semibold">📱 Zelf iets gepost over CeritaProject?</p>
        <p className="text-xs text-muted-foreground">Stuur de link in (max. 2 posts per week). Zet #samenwerking erbij.</p>
        {open !== "los" && (
          <Button size="sm" variant="outline" className="mt-2 rounded-full bg-card" onClick={() => setOpen("los")}>
            Post insturen
          </Button>
        )}
        {form("los", null)}
      </div>

      {subs.length > 0 && (
        <div className="space-y-2 pt-1">
          <h3 className="text-sm font-semibold">Mijn inzendingen</h3>
          {subs.map((s) => (
            <div key={s.id} className="flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-sm">
              {s.photo_path && <SubPhoto path={s.photo_path} />}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{taskName(s.task_id)}</p>
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noreferrer noopener" className="block truncate text-xs text-muted-foreground underline">
                    {s.url}
                  </a>
                ) : (
                  <p className="text-xs text-muted-foreground">📸 Foto</p>
                )}
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[s.status]?.cls ?? ""}`}>
                {STATUS[s.status]?.label ?? s.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
