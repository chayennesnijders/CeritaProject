import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AMBASSADOR_MIN_AGE,
  AMBASSADOR_RULES,
  isSubmissionUrl,
  LEVELS,
  levelFor,
  nextLevel,
  POINT_RULES,
  referralLink,
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
  task_points: number;
  approved: number;
  pending: number;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  ingediend: { label: "⏳ Wordt bekeken", cls: "bg-muted text-muted-foreground" },
  goedgekeurd: { label: "✅ Goedgekeurd", cls: "bg-emerald-100 text-emerald-800" },
  afgewezen: { label: "Niet goedgekeurd", cls: "bg-rose-100 text-rose-800" },
};

/** The Cerita Ambassadors portal: your link, numbers, assignments, points, rewards and your details. */
function AmbassadorPage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const uid = me?.user.id;

  const { data: stats, isLoading } = useQuery({
    queryKey: ["ambassador-stats", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_ambassador_stats");
      if (error) throw error;
      return (data as Stats | null) ?? null;
    },
  });
  const isAmb = !!stats?.active;
  const agreed = !!stats?.agreed_at;

  const { data: work } = useQuery({
    queryKey: ["ambassador-work", uid],
    enabled: !!uid && isAmb,
    queryFn: async () => {
      const [t, s] = await Promise.all([
        supabase.from("ambassador_tasks").select("*").eq("active", true).order("created_at", { ascending: false }),
        supabase.from("ambassador_submissions").select("*").eq("user_id", uid!).order("created_at", { ascending: false }).limit(30),
      ]);
      if (t.error) throw t.error;
      if (s.error) throw s.error;
      return { tasks: t.data ?? [], subs: s.data ?? [] };
    },
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["ambassador-stats", uid] });
    void qc.invalidateQueries({ queryKey: ["ambassador-work", uid] });
  };

  const agree = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("agree_ambassador_terms");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Welkom, ambassadeur! 💖");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!me || isLoading) return null;

  if (!isAmb)
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

  const points = totalPoints(Number(stats.signups), Number(stats.task_points));
  const level = levelFor(points);
  const next = nextLevel(points);
  const link = referralLink(stats.code);

  return (
    <div className="space-y-5 pb-8 pt-2">
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
      ) : (
        <>
          {/* 2. Personal link */}
          <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
            <h2 className="text-lg">🔗 Jouw link</h2>
            <p className="text-sm text-muted-foreground">
              Zet hem in je bio, story of bij je post. Elke aanmelding op de wachtlijst via deze link is 1 punt voor jou.
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

          {/* 3. Stats */}
          <section className="grid grid-cols-2 gap-3">
            <Stat emoji="📝" value={Number(stats.signups)} label="aanmeldingen via jou" />
            <Stat emoji="⭐" value={points} label="punten totaal" />
            <Stat emoji="✅" value={Number(stats.approved)} label="goedgekeurde posts" />
            <Stat emoji="⏳" value={Number(stats.pending)} label="wachten op check" />
          </section>

          {/* 4. Assignments and submissions */}
          <Assignments uid={me.user.id} tasks={work?.tasks ?? []} subs={work?.subs ?? []} onDone={refresh} />
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
            <summary className="cursor-pointer text-sm font-semibold">De afspraken nog eens lezen</summary>
            <div className="pt-2">
              <Rules />
            </div>
          </details>
        )}
        <p className="text-xs text-muted-foreground">
          Je ziet alleen aantallen, nooit wie zich via jou heeft aangemeld. Wil je stoppen of klopt er iets niet? Stuur ons een{" "}
          <Link to="/contact" className="underline">
            bericht
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

function Rules() {
  return (
    <ul className="space-y-1.5 text-sm">
      {AMBASSADOR_RULES.map((r) => (
        <li key={r} className="flex gap-2">
          <span className="text-primary">♥</span>
          <span>{r}</span>
        </li>
      ))}
    </ul>
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
type Sub = { id: string; task_id: string | null; url: string; note: string; status: string; points: number; created_at: string };

function Assignments({ uid, tasks, subs, onDone }: { uid: string; tasks: Task[]; subs: Sub[]; onDone: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const send = useMutation({
    mutationFn: async (taskId: string | null) => {
      if (!isSubmissionUrl(url)) throw new Error("Plak de link naar je post (begint met https://).");
      const { error } = await supabase
        .from("ambassador_submissions")
        .insert({ user_id: uid, task_id: taskId, url: url.trim(), note: note.trim().slice(0, 300) });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ingestuurd! We kijken er snel naar 💖");
      setUrl("");
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
        <Input placeholder="https://www.tiktok.com/..." value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" />
        <Input placeholder="Iets erbij vertellen? (mag leeg)" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
        <Button className="w-full rounded-full" disabled={send.isPending} onClick={() => send.mutate(taskId)}>
          Insturen
        </Button>
      </div>
    );

  return (
    <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
      <h2 className="text-lg">🎯 Opdrachten</h2>
      {tasks.length === 0 && <p className="text-sm text-muted-foreground">Er staan nu geen opdrachten klaar. Je krijgt bericht als er een nieuwe is.</p>}
      {tasks.map((t) => (
        <div key={t.id} className="rounded-2xl border-2 border-primary/30 p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <p className="font-semibold">{t.title}</p>
              {t.body && <p className="text-sm text-muted-foreground">{t.body}</p>}
              {t.due && <p className="mt-1 text-xs text-muted-foreground">Uiterlijk {new Date(t.due).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}</p>}
            </div>
            <span className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">+{t.points}</span>
          </div>
          {subs.some((s) => s.task_id === t.id && s.status !== "afgewezen") ? (
            <p className="mt-2 text-xs font-semibold text-primary">✓ Ingestuurd</p>
          ) : (
            open !== t.id && (
              <Button size="sm" variant="outline" className="mt-2 rounded-full" onClick={() => setOpen(t.id)}>
                Klaar? Stuur je link in
              </Button>
            )
          )}
          {form(t.id, t.id)}
        </div>
      ))}
      <div className="rounded-2xl bg-muted p-3">
        <p className="text-sm font-semibold">📱 Zelf iets gepost over CeritaProject?</p>
        <p className="text-xs text-muted-foreground">Stuur de link in. Goedgekeurd = 2 punten (max. 2 posts per week).</p>
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
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{taskName(s.task_id)}</p>
                <a href={s.url} target="_blank" rel="noreferrer noopener" className="block truncate text-xs text-muted-foreground underline">
                  {s.url}
                </a>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[s.status]?.cls ?? ""}`}>
                {STATUS[s.status]?.label ?? s.status}
                {s.status === "goedgekeurd" && ` +${s.points}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
