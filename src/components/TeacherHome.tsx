import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, Download, ExternalLink, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { teacherCatalog, teacherFile } from "@/lib/lessons.functions";
import { LESSON_LEVELS, lessonsForLevels, licenceEnd, sortForTeacher, teacherDay, type LessonLevel } from "@/lib/teacher";
import { useTeacherLevels } from "@/lib/use-teacher-levels";
import { dutchToday } from "@/lib/lessons";
import { Riti } from "@/components/Riti";
import { Button } from "@/components/ui/button";

function useTeacherLessons(uid: string) {
  const catalog = useServerFn(teacherCatalog);
  return useQuery({ queryKey: ["teacher-lessons", uid], queryFn: () => catalog() });
}

/** Home for teachers: today's tip and class task, the diary, and a button to the lessons. */
export function TeacherHome({ uid, name }: { uid: string; name: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useTeacherLessons(uid);
  const { levels } = useTeacherLevels(uid);
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);

  async function newCode() {
    setSaving(true);
    const { data: school, error } = await supabase.rpc("become_teacher", { _code: code });
    setSaving(false);
    if (error) {
      toast.error(error.message || "Dat lukte niet.");
      return;
    }
    toast.success(`Gekoppeld aan ${school} 🎉`);
    setCode("");
    void qc.invalidateQueries({ queryKey: ["teacher-lessons", uid] });
  }

  const lessons = lessonsForLevels(sortForTeacher(data?.lessons ?? []), levels);
  const today = dutchToday();
  const day = teacherDay(today);
  // "Gedaan" for today's class task is only remembered on this device: a small personal nudge.
  const doneKey = `cerita-leraar-opdracht-${today}`;
  const [done, setDone] = useState(false);
  useEffect(() => {
    try {
      setDone(localStorage.getItem(doneKey) === "1");
    } catch {
      setDone(false);
    }
  }, [doneKey]);
  function toggleDone() {
    const next = !done;
    setDone(next);
    try {
      if (next) localStorage.setItem(doneKey, "1");
      else localStorage.removeItem(doneKey);
    } catch {
      // Not remembered on this device; the tick still shows for now.
    }
  }

  return (
    <div className="space-y-4 pt-2">
      <section className="flex items-center gap-3 rounded-3xl bg-card p-4 shadow-soft">
        <Riti size={84} expression="blij" />
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Voor leraren</p>
          <h1 className="text-2xl leading-tight">Hoi {name || "juf of meester"} 👋</h1>
          {data?.school ? (
            <p className="text-sm text-muted-foreground">
              🏫 {data.school} · tot en met {licenceEnd(data.validUntil!)}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Hier vind je de lessen die je kunt geven.
            </p>
          )}
        </div>
      </section>

      {data && !data.school && (
        <section className="space-y-2 rounded-3xl bg-secondary p-4 text-secondary-foreground">
          <p className="text-sm font-semibold">
            {data.expiredSchool
              ? `De schoolcode van ${data.expiredSchool} werkt niet meer.`
              : "Je account is nog niet aan een school gekoppeld."}
          </p>
          <p className="text-xs">
            Vul de nieuwe code van je school in om alle lessen weer te openen.
          </p>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Bijv. KX7P-2M9Q"
              autoComplete="off"
              aria-label="Schoolcode"
              className="h-11 min-w-0 flex-1 rounded-2xl border border-input bg-background px-3 uppercase tracking-wider text-foreground placeholder:normal-case placeholder:tracking-normal"
            />
            <Button
              disabled={!code.trim() || saving}
              onClick={newCode}
              className="h-11 rounded-full"
            >
              {saving ? "Bezig…" : "Koppelen"}
            </Button>
          </div>
        </section>
      )}

      <Link
        to="/mijn-lessen"
        className="flex items-center gap-3 rounded-3xl bg-primary p-4 text-primary-foreground shadow-soft transition active:scale-[0.99]"
      >
        <span className="text-3xl">📚</span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold">Lessen</span>
          <span className="block text-xs opacity-80">
            {isLoading
              ? "Lessen laden…"
              : `${lessons.filter((l) => l.unlocked).length} ${lessons.filter((l) => l.unlocked).length === 1 ? "les" : "lessen"} klaar om te geven`}
          </span>
        </span>
        <span aria-hidden className="text-xl">›</span>
      </Link>

      <section className="space-y-3 rounded-3xl bg-ink p-4 text-ink-foreground shadow-soft">
        <p className="text-xs font-bold uppercase tracking-wider opacity-70">Tip van vandaag</p>
        <p className="text-sm leading-relaxed">💡 {day.tip}</p>
        <div className="rounded-2xl bg-ink-foreground/10 p-3">
          <p className="text-xs font-bold uppercase tracking-wider opacity-70">
            Opdrachtje voor in de klas
          </p>
          <p className="mt-1 text-sm">{day.task}</p>
          <button
            onClick={toggleDone}
            className={`mt-2 rounded-full px-3 py-1 text-xs font-semibold ${done ? "bg-primary text-primary-foreground" : "bg-ink-foreground/15"}`}
          >
            {done ? "✅ Gedaan, goed bezig!" : "Gedaan"}
          </button>
        </div>
      </section>

      <Link to="/dagboek" className="flex items-center gap-3 rounded-3xl bg-card p-4 shadow-soft">
        <span className="text-3xl">📔</span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Mijn dagboek</span>
          <span className="block text-xs text-muted-foreground">
            {day.reflect} · Alleen voor jou
          </span>
        </span>
        <span aria-hidden>›</span>
      </Link>

      <section className="rounded-3xl bg-secondary p-4 text-sm text-secondary-foreground">
        <p className="font-semibold">Zorg goed voor je klas 💛</p>
        <p className="mt-1">
          Laat de zorgcoördinator weten wanneer je een les geeft. Vertelt een leerling iets
          zorgelijks, volg dan het protocol van je school. Hulplijnen voor jongeren: Kindertelefoon
          0800-0432 en 113 Zelfmoordpreventie 0800-0113. Bij direct gevaar: 112.
        </p>
      </section>
      <p className="px-1 text-xs text-muted-foreground">
        Je leraar-account ziet niets van de jongeren in de app: geen groepen, chats of profielen.
      </p>
    </div>
  );
}

/** The school's lessons, each folded so the list stays clear; tap one to open or download its files. */
export function TeacherLessons({ uid }: { uid: string }) {
  const file = useServerFn(teacherFile);
  const { data, isLoading, isError } = useTeacherLessons(uid);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const { levels, loaded, save } = useTeacherLevels(uid);
  const lessons = lessonsForLevels(sortForTeacher(data?.lessons ?? []), levels);
  function toggleLevel(id: LessonLevel) {
    void save(levels.includes(id) ? levels.filter((x) => x !== id) : [...levels, id]);
    setOpen(null);
  }

  async function get(fileId: string, open: boolean) {
    setBusy(fileId + (open ? "o" : "d"));
    // Open the tab now (still inside the tap) so phones and tablets don't block it.
    const tab = open ? window.open("", "_blank") : null;
    try {
      const { url } = await file({ data: { fileId, open } });
      if (tab) tab.location.href = url;
      else window.location.href = url;
    } catch (e) {
      tab?.close();
      toast.error(e instanceof Error ? e.message : "Dat lukte niet.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-2 px-1">
        <Link to="/home" className="rounded-full bg-card px-3 py-1 text-sm font-semibold shadow-soft">
          ‹ Terug
        </Link>
      </div>
      <h1 className="px-1 text-3xl">📚 Lessen</h1>
      {data?.school && (
        <p className="-mt-2 px-1 text-sm text-muted-foreground">🏫 {data.school}</p>
      )}
      {loaded && (
        <section className={`space-y-2 rounded-3xl p-4 ${levels.length ? "bg-card shadow-soft" : "bg-secondary text-secondary-foreground"}`}>
          <p className="text-sm font-semibold">
            {levels.length ? "Ik geef les aan" : "Voor welke groep geef je les? Kies er één of meer."}
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Voor welke groep geef je les?">
            {LESSON_LEVELS.map((lv) => {
              const on = levels.includes(lv.id);
              return (
                <button
                  key={lv.id}
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggleLevel(lv.id)}
                  className={`rounded-full px-3 py-2 text-left text-sm font-semibold transition active:scale-95 ${on ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
                >
                  {on ? "✓ " : ""}
                  {lv.label}
                  <span className="block text-[11px] font-normal opacity-75">{lv.hint}</span>
                </button>
              );
            })}
          </div>
          {!levels.length && <p className="text-xs">Tot je kiest, zie je alle lessen.</p>}
        </section>
      )}
      {isLoading && <p className="px-1 text-sm text-muted-foreground">Lessen laden…</p>}
      {isError && (
        <p className="px-1 text-sm text-muted-foreground">
          De lessen laden lukte even niet. Probeer het zo nog eens.
        </p>
      )}
      {data && lessons.length === 0 && (
        <p className="px-1 text-sm text-muted-foreground">
          {levels.length
            ? "Voor deze groep komen de lessen er binnenkort aan."
            : "De eerste lessen komen er binnenkort aan."}
        </p>
      )}
      {lessons.map((l) => (
        <article key={l.id} className="space-y-3 rounded-3xl bg-card p-4 shadow-soft">
          <button
            onClick={() => setOpen(open === l.id ? null : l.id)}
            aria-expanded={open === l.id}
            className="flex w-full items-start gap-3 text-left"
          >
            <span className="text-3xl">{l.emoji}</span>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg leading-snug">{l.title}</h3>
              <p className="text-xs text-muted-foreground">
                {[l.audience, `${l.minutes} min`, l.theme].filter(Boolean).join(" · ")}
              </p>
            </div>
            {l.isFree && (
              <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                Proefles
              </span>
            )}
            <ChevronDown
              className={`mt-1 size-5 shrink-0 transition-transform ${open === l.id ? "rotate-180" : ""}`}
            />
          </button>
          {open === l.id && l.summary && <p className="text-sm">{l.summary}</p>}
          {open !== l.id ? null : l.unlocked ? (
            l.files.length ? (
              <ul className="space-y-2">
                {l.files.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 flex-1 font-semibold">{f.label}</span>
                    <button
                      onClick={() => void get(f.id, true)}
                      disabled={!!busy}
                      className="flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-ink-foreground disabled:opacity-60"
                    >
                      <ExternalLink className="size-3.5" /> {busy === f.id + "o" ? "…" : "Openen"}
                    </button>
                    <button
                      onClick={() => void get(f.id, false)}
                      disabled={!!busy}
                      aria-label={`${f.label} downloaden`}
                      className="rounded-full bg-card p-1.5 disabled:opacity-60"
                    >
                      <Download className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">De bestanden komen er binnenkort bij.</p>
            )
          ) : (
            <p className="flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
              <Lock className="size-4 shrink-0" /> Open met een werkende schoolcode
            </p>
          )}
        </article>
      ))}

      <p className="px-1 text-xs text-muted-foreground">
        Laat de zorgcoördinator weten wanneer je een les geeft. Hulplijnen voor jongeren: Kindertelefoon
        0800-0432 en 113 Zelfmoordpreventie 0800-0113. Bij direct gevaar: 112.
      </p>
    </div>
  );
}
