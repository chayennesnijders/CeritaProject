import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSignedImage } from "@/lib/articles";
import { AMBASSADOR_MIN_AGE, isCurrentTask, isUpcomingTask, levelFor, referralLink, totalPoints } from "@/lib/ambassador";
import { challengeDay } from "@/lib/challenges";

/** Beheer → Ambassadeurs: add ambassadors (18+), give assignments and check what they send in. */
export function AmbassadorsAdmin() {
  const qc = useQueryClient();
  const [referredBy, setReferredBy] = useState("");
  const [username, setUsername] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [due, setDue] = useState("");
  const [starts, setStarts] = useState("");
  const [showAll, setShowAll] = useState(false);

  const { data } = useQuery({
    queryKey: ["ambassadors-admin"],
    queryFn: async () => {
      const [o, t, s] = await Promise.all([
        supabase.rpc("ambassador_overview"),
        supabase.from("ambassador_tasks").select("*").order("starts", { ascending: true, nullsFirst: true }),
        supabase.from("ambassador_submissions").select("*").eq("status", "ingediend").order("created_at"),
      ]);
      if (o.error) throw o.error;
      return { people: o.data ?? [], tasks: t.data ?? [], subs: s.data ?? [] };
    },
  });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["ambassadors-admin"] });
  const today = challengeDay();
  const run = (fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) =>
    void Promise.resolve(fn()).then(({ error }) => {
      toast[error ? "error" : "success"](error ? error.message : ok);
      if (!error) refresh();
    });

  const add = useMutation({
    mutationFn: async () => {
      const { data: code, error } = await supabase.rpc("add_ambassador", { _username: username, ...(referredBy.trim() ? { _referred_by: referredBy.trim() } : {}) });
      if (error) throw error;
      return code as string;
    },
    onSuccess: (code) => {
      toast.success(`Ambassadeur toegevoegd. Code: ${code}`);
      setUsername("");
      setReferredBy("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const people = data?.people ?? [];
  const nameOf = (id: string) => {
    const p = people.find((x) => x.user_id === id);
    return p ? `${p.display_name}${p.username ? ` (@${p.username})` : ""}` : "Ambassadeur";
  };
  const taskOf = (id: string | null) => data?.tasks.find((t) => t.id === id);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Ambassadeurs ({AMBASSADOR_MIN_AGE}+) zien hun eigen portaal onder Profiel → 💖 Ambassadeur: hun link, punten,
        opdrachten en beloningen. Ze zien alleen aantallen, nooit wie zich via hen aanmeldde.
      </p>

      <section className="space-y-2 rounded-3xl bg-card p-4 shadow-soft">
        <h3 className="font-semibold">➕ Ambassadeur toevoegen</h3>
        <div className="flex flex-wrap gap-2 [&>input]:min-w-[10rem] [&>input]:flex-1">
          <Input placeholder="gebruikersnaam" value={username} onChange={(e) => setUsername(e.target.value)} />
          <Input placeholder="aangebracht door (code, mag leeg)" value={referredBy} onChange={(e) => setReferredBy(e.target.value)} />
          <Button className="rounded-full" disabled={!username.trim() || add.isPending} onClick={() => add.mutate()}>
            Toevoegen
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Het lid moet eerst zelf een account hebben en 18 jaar of ouder zijn.</p>
        <a href="/flyer" target="_blank" rel="noopener" className="inline-block text-xs font-semibold underline">
          🖨️ Flyer van het team printen (zonder ambassadeurscode, bron ‘flyer’)
        </a>
      </section>

      <section className="space-y-2 rounded-3xl bg-card p-4 shadow-soft">
        <h3 className="font-semibold">💖 Ambassadeurs ({people.length})</h3>
        {people.length === 0 && <p className="text-sm text-muted-foreground">Nog niemand toegevoegd.</p>}
        {people.map((p) => {
          const pts = totalPoints({ signups: Number(p.signups), activeWeek: Number(p.active_week), recruits: Number(p.recruits), recruitsStarted: Number(p.recruits_started), challenges: Number(p.tasks_done) });
          const lvl = levelFor(pts);
          return (
            <div key={p.user_id} className={`rounded-2xl border p-3 text-sm ${p.active ? "" : "opacity-60"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{p.display_name}</span>
                {p.username && <span className="text-muted-foreground">@{p.username}</span>}
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                  {lvl ? `${lvl.emoji} ${lvl.name}` : "🌱 Nieuw"} · {pts} pt
                </span>
                {!p.agreed_at && <span className="rounded-full bg-muted px-2 py-0.5 text-xs">nog niet akkoord</span>}
                {!p.active && <span className="rounded-full bg-muted px-2 py-0.5 text-xs">gestopt</span>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {Number(p.signups)} aanmeldingen · {Number(p.active_week)} een week actief · {Number(p.recruits)} nieuwe ambassadeurs
                ({Number(p.recruits_started)} met eerste aanmelding) · {Number(p.tasks_done)} challenges{p.referred_by ? ` · aangebracht door ${p.referred_by}` : ""} · {Number(p.pending)} inzendingen
                wachten · bron{" "}
                <span className="font-mono">amb-{p.code}</span>
              </p>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => void navigator.clipboard?.writeText(referralLink(p.code)).then(() => toast.success("Link gekopieerd"), () => {})}
                >
                  Kopieer link
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() =>
                    run(
                      () => supabase.rpc("set_ambassador_active", { _user: p.user_id, _active: !p.active }),
                      p.active ? "Gestopt als ambassadeur" : "Weer actief",
                    )
                  }
                >
                  {p.active ? "Stoppen" : "Weer aanzetten"}
                </Button>
              </div>
            </div>
          );
        })}
      </section>

      <section className="space-y-2 rounded-3xl bg-card p-4 shadow-soft">
        <h3 className="font-semibold">📥 Te beoordelen ({data?.subs.length ?? 0})</h3>
        {(data?.subs.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">Niks te checken 🎉</p>}
        {data?.subs.map((s) => (
          <div key={s.id} className="rounded-2xl border p-3 text-sm">
            <p className="font-semibold">{nameOf(s.user_id)}</p>
            <p className="text-xs text-muted-foreground">
              {taskOf(s.task_id) ? `${taskOf(s.task_id)!.title} · +1 punt` : "Eigen post · geen punt"} ·{" "}
              {new Date(s.created_at).toLocaleDateString("nl-NL")}
            </p>
            {s.url && (
              <a href={s.url} target="_blank" rel="noreferrer noopener" className="block truncate text-xs underline">
                {s.url}
              </a>
            )}
            {s.photo_path && <SubmissionPhoto path={s.photo_path} />}
            {s.note && <p className="mt-1 text-xs">“{s.note}”</p>}
            <div className="mt-2 flex gap-2">
              <Button size="sm" className="rounded-full" onClick={() => run(() => supabase.rpc("review_submission", { _id: s.id, _ok: true }), "Goedgekeurd")}>
                Goedkeuren
              </Button>
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => run(() => supabase.rpc("review_submission", { _id: s.id, _ok: false }), "Afgewezen")}>
                Afwijzen
              </Button>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-2 rounded-3xl bg-card p-4 shadow-soft">
        <h3 className="font-semibold">🎯 Opdrachten</h3>
        <Input placeholder="Titel, bijv. ‘Maak een video over je dagboek’" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
        <Input placeholder="Uitleg (mag leeg)" value={body} maxLength={600} onChange={(e) => setBody(e.target.value)} />
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-1">
            Vanaf
            <Input type="date" className="w-40" value={starts} onChange={(e) => setStarts(e.target.value)} />
          </label>
          <label className="flex items-center gap-1">
            Uiterlijk
            <Input type="date" className="w-40" value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
          <Button
            className="rounded-full"
            disabled={title.trim().length < 2}
            onClick={() =>
              run(async () => {
                const r = await supabase
                  .from("ambassador_tasks")
                  .insert({
                    title: title.trim(),
                    body: body.trim(),
                    starts: starts || null,
                    due: due || null,
                  });
                if (!r.error) {
                  setTitle("");
                  setBody("");
                  setDue("");
                  setStarts("");
                }
                return r;
              }, "Opdracht toegevoegd")
            }
          >
            Toevoegen
          </Button>
        </div>
        {(() => {
          const all = data?.tasks ?? [];
          const now = all.filter((t) => isCurrentTask(t, today));
          const soon = all.filter((t) => isUpcomingTask(t, today));
          const rest = all.filter((t) => !now.includes(t) && !soon.includes(t));
          return (
            <>
              <p className="pt-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Deze week ({now.length})</p>
              {now.map(taskRow)}
              <p className="pt-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Gepland ({soon.length}) · verschijnen vanzelf op maandag
              </p>
              {(showAll ? soon : soon.slice(0, 6)).map(taskRow)}
              {(soon.length > 6 || rest.length > 0) && (
                <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setShowAll(!showAll)}>
                  {showAll ? "Minder tonen" : `Alles tonen (${soon.length} gepland, ${rest.length} voorbij of verborgen)`}
                </Button>
              )}
              {showAll && rest.length > 0 && (
                <>
                  <p className="pt-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Voorbij of verborgen</p>
                  {rest.map(taskRow)}
                </>
              )}
            </>
          );
        })()}
      </section>
    </div>
  );

  function taskRow(t: NonNullable<typeof data>["tasks"][number]) {
    return (
          <div key={t.id} className={`flex items-center gap-2 rounded-2xl border p-3 text-sm ${t.active ? "" : "opacity-60"}`}>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {t.title}
              </p>
              {t.starts && (
                <p className="text-xs text-muted-foreground">
                  {fmt(t.starts)}
                  {t.due ? ` t/m ${fmt(t.due)}` : ""}
                </p>
              )}
              {t.body && <p className="text-xs text-muted-foreground">{t.body}</p>}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => run(() => supabase.from("ambassador_tasks").update({ active: !t.active }).eq("id", t.id), t.active ? "Opdracht verborgen" : "Opdracht weer zichtbaar")}
            >
              {t.active ? "Verbergen" : "Tonen"}
            </Button>
          </div>
    );
  }
}

const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });

function SubmissionPhoto({ path }: { path: string }) {
  const { data: src } = useSignedImage("ambassador-photos", path);
  return src ? (
    <a href={src} target="_blank" rel="noreferrer noopener" className="mt-2 block">
      <img src={src} alt="Ingestuurde foto" className="max-h-56 rounded-2xl object-cover" />
    </a>
  ) : null;
}
