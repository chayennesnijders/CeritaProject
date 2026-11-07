import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { countBySource, sourceLabel, storeLabel, WAITLIST_STORES } from "@/lib/waitlist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Beheer → Overzicht: the waiting list. Counts per phone, copy the addresses (Android first), mark
 * them as mailed, and take someone off the list (with an in-app confirmation).
 */
export function WaitlistAdmin() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [confirmCleanup, setConfirmCleanup] = useState(false);
  const [who, setWho] = useState<"alle" | "jongere" | "ouder">("alle");
  const { data: all = [], error } = useQuery({
    queryKey: ["waitlist"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("waitlist")
        .select("id, email, age, store, parent_ok, source, created_at, mailed_at, kind")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  // Young people and parents share the list; the choice above filters everything below.
  const rows = who === "alle" ? all : all.filter((r) => (r.kind ?? "jongere") === who);
  const week = Date.now() - 7 * 86400000;
  const recent = rows.filter((r) => new Date(r.created_at).getTime() > week).length;
  const toMail = (store: string) =>
    rows.filter((r) => !r.mailed_at && (r.store === store || r.store === "beide"));

  async function copy(list: typeof rows, label: string) {
    if (!list.length) {
      toast("Niemand om te mailen.");
      return;
    }
    await navigator.clipboard.writeText(list.map((r) => r.email).join(", "));
    toast.success(`${list.length} adressen (${label}) gekopieerd. Zet ze in BCC!`);
  }
  async function markMailed(list: typeof rows) {
    if (!list.length) return;
    const { error: err } = await supabase
      .from("waitlist")
      .update({ mailed_at: new Date().toISOString() })
      .in(
        "id",
        list.map((r) => r.id),
      );
    toast[err ? "error" : "success"](err ? err.message : `${list.length} gemarkeerd als gemaild`);
    qc.invalidateQueries({ queryKey: ["waitlist"] });
  }
  async function remove(id: string) {
    const { data, error: err } = await supabase.from("waitlist").delete().eq("id", id).select("id");
    setConfirm(null);
    if (err || !data?.length) {
      toast.error(err?.message ?? "Verwijderen lukte niet");
      return;
    }
    toast.success("Van de wachtlijst gehaald");
    qc.invalidateQueries({ queryKey: ["waitlist"] });
  }

  // The privacy statement promises: after the mail, you come off the list.
  async function removeMailed() {
    const { data, error: err } = await supabase
      .from("waitlist")
      .delete()
      .not("mailed_at", "is", null)
      .select("id");
    setConfirmCleanup(false);
    if (err) {
      toast.error(err.message);
      return;
    }
    toast.success(`${data?.length ?? 0} gemailde adressen van de lijst gehaald`);
    qc.invalidateQueries({ queryKey: ["waitlist"] });
  }
  const mailed = rows.filter((r) => r.mailed_at).length;

  const shown = rows.filter((r) => r.email.includes(q.trim().toLowerCase())).slice(0, 30);
  return (
    <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
      <h2 className="text-lg">📝 Wachtlijst</h2>
      <div className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1 text-xs font-semibold">
        {(
          [
            ["alle", `Alle (${all.length})`],
            ["jongere", `🧑 Jongeren (${all.filter((r) => (r.kind ?? "jongere") === "jongere").length})`],
            ["ouder", `👨‍👩‍👧 Ouders (${all.filter((r) => r.kind === "ouder").length})`],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setWho(k)}
            className={`rounded-full px-2 py-2 ${who === k ? "bg-primary text-primary-foreground" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>
      {error ? (
        <p className="text-sm text-destructive">
          Laden lukte niet. Zijn update-32 en update-60 al in Supabase geplakt?
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 text-center text-sm">
            <div className="rounded-2xl bg-muted p-3">
              <span className="block text-2xl font-bold text-primary">{rows.length}</span>op de
              lijst
            </div>
            <div className="rounded-2xl bg-muted p-3">
              <span className="block text-2xl font-bold text-primary">{recent}</span>deze week
            </div>
            {WAITLIST_STORES.map((s) => (
              <div key={s.id} className="rounded-2xl bg-muted p-3 last:col-span-2">
                <span className="block text-xl font-bold">
                  {rows.filter((r) => r.store === s.id).length}
                </span>
                {s.emoji} {s.label}
              </div>
            ))}
          </div>
          <div className="space-y-1.5 rounded-2xl bg-muted p-3">
            <p className="text-sm font-semibold">Waar komen ze vandaan?</p>
            {countBySource(rows).map((x) => (
              <div key={x.source} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{x.label}</span>
                <span className="font-bold">{x.count}</span>
                <span className="w-10 text-right text-xs text-muted-foreground">
                  {Math.round((x.count / rows.length) * 100)}%
                </span>
              </div>
            ))}
            {rows.length === 0 && <p className="text-xs text-muted-foreground">Nog niemand.</p>}
            <p className="pt-1 text-[11px] text-muted-foreground">
              Zet achter je link waar je hem deelt, bijvoorbeeld app.ceritaproject.nl/wachtlijst
              <strong>?bron=whatsapp</strong>. Dan zie je het hier.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Mailen: kopieer de adressen en zet ze in je mail in <strong>BCC</strong>, zodat niemand
            elkaars adres ziet. Daarna tik je op "gemaild", zodat je niemand twee keer mailt.
          </p>
          <div className="grid gap-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-full"
                onClick={() => copy(toMail("play"), "Android")}
              >
                🤖 Kopieer Android ({toMail("play").length})
              </Button>
              <Button
                variant="ghost"
                className="rounded-full"
                onClick={() => markMailed(toMail("play"))}
              >
                gemaild
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-full"
                onClick={() => copy(toMail("apple"), "iPhone")}
              >
                🍎 Kopieer iPhone ({toMail("apple").length})
              </Button>
              <Button
                variant="ghost"
                className="rounded-full"
                onClick={() => markMailed(toMail("apple"))}
              >
                gemaild
              </Button>
            </div>
          </div>
          {mailed > 0 &&
            (confirmCleanup ? (
              <div className="flex items-center gap-2 rounded-2xl bg-muted p-2 text-sm">
                <span className="flex-1">{mailed} gemailde adressen weghalen?</span>
                <Button
                  size="sm"
                  variant="destructive"
                  className="rounded-full"
                  onClick={removeMailed}
                >
                  Ja
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full"
                  onClick={() => setConfirmCleanup(false)}
                >
                  Nee
                </Button>
              </div>
            ) : (
              <button className="text-xs underline" onClick={() => setConfirmCleanup(true)}>
                Haal de {mailed} gemailde adressen van de lijst (dat beloven we in de
                privacyverklaring)
              </button>
            ))}
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Zoek een e-mailadres…"
            className="rounded-2xl"
          />
          <div className="space-y-1">
            {shown.map((r) => (
              <div key={r.id} className="rounded-2xl bg-muted p-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-semibold">{r.email}</span>
                  {confirm === r.id ? (
                    <>
                      <button
                        className="font-semibold text-destructive"
                        onClick={() => remove(r.id)}
                      >
                        Ja, weg
                      </button>
                      <button onClick={() => setConfirm(null)}>Nee</button>
                    </>
                  ) : (
                    <button className="underline" onClick={() => setConfirm(r.id)}>
                      Verwijderen
                    </button>
                  )}
                </div>
                <p className="text-muted-foreground">
                  {r.kind === "ouder" ? "👨‍👩‍👧 ouder" : `${r.age} jaar`} · {storeLabel(r.store)}
                  {` · ${sourceLabel(r.source)}`} ·{" "}
                  {new Date(r.created_at).toLocaleDateString("nl-NL")}
                  {r.mailed_at ? " · ✉️ gemaild" : ""}
                </p>
              </div>
            ))}
            {rows.length === 0 && <p className="text-sm text-muted-foreground">Nog niemand.</p>}
          </div>
        </>
      )}
    </section>
  );
}
