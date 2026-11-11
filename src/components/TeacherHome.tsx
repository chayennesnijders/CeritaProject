import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, ExternalLink, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { teacherCatalog, teacherFile } from "@/lib/lessons.functions";
import { licenceEnd, sortForTeacher } from "@/lib/teacher";
import { Riti } from "@/components/Riti";
import { Button } from "@/components/ui/button";

/** Home for teachers: the lessons of their school, ready to open in class or download. */
export function TeacherHome({ uid, name }: { uid: string; name: string }) {
  const catalog = useServerFn(teacherCatalog);
  const file = useServerFn(teacherFile);
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["teacher-lessons", uid],
    queryFn: () => catalog(),
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);

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

  const lessons = sortForTeacher(data?.lessons ?? []);

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

      <h2 className="px-1 text-lg">Jouw lessen</h2>
      {isLoading && <p className="px-1 text-sm text-muted-foreground">Lessen laden…</p>}
      {isError && (
        <p className="px-1 text-sm text-muted-foreground">
          De lessen laden lukte even niet. Probeer het zo nog eens.
        </p>
      )}
      {data && lessons.length === 0 && (
        <p className="px-1 text-sm text-muted-foreground">
          De eerste lessen komen er binnenkort aan.
        </p>
      )}
      {lessons.map((l) => (
        <article key={l.id} className="space-y-3 rounded-3xl bg-card p-4 shadow-soft">
          <div className="flex items-start gap-3">
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
          </div>
          {l.summary && <p className="text-sm">{l.summary}</p>}
          {l.unlocked ? (
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
