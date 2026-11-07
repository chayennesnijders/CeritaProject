import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ageGroupFor, useMe } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConsentGate } from "@/components/ConsentGate";
import { UsernameGate } from "@/components/UsernameGate";

/**
 * Everyone needs a birthdate (it decides your age group and which stories you see).
 * Members without one (e.g. older accounts) fill it in here before using the app.
 */
export function BirthdateGate({ children }: { children: React.ReactNode }) {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [tooYoung, setTooYoung] = useState(false);
  // Chose "Ik ben ouder" when signing up: go straight to the parent step.
  const [parentStep, setParentStep] = useState(() => !!me?.user.user_metadata?.["wants_parent"]);
  const [wantsParentSeen, setWantsParentSeen] = useState(false);
  if (!wantsParentSeen && !parentStep && me?.user.user_metadata?.["wants_parent"]) {
    setWantsParentSeen(true);
    setParentStep(true);
  }

  // Parents have no birthdate on purpose: they never join the young people's groups or chats.
  if (!me?.profile || me.profile.birthdate || me.profile.is_parent)
    return (
      <ConsentGate>
        <UsernameGate>{children}</UsernameGate>
      </ConsentGate>
    );

  async function save() {
    if (!date || !me?.profile) return;
    if (ageGroupFor(new Date(date)) === "too_young") {
      setTooYoung(true);
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ birthdate: date })
      .eq("id", me.profile.id);
    setBusy(false);
    if (error) {
      toast.error("Opslaan lukte niet. Probeer het opnieuw.");
      return;
    }
    toast.success("Dank je wel! 🎉");
    qc.invalidateQueries({ queryKey: ["me"] });
  }
  async function becomeParent() {
    setBusy(true);
    const { error } = await supabase.rpc("become_parent");
    setBusy(false);
    if (error) {
      toast.error(error.message || "Dat lukte niet. Probeer het opnieuw.");
      return;
    }
    toast.success("Welkom! 💛");
    qc.invalidateQueries({ queryKey: ["me"] });
  }
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/", replace: true });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <img src="/cerita-logo.webp" alt="CeritaProject" className="size-28 rounded-3xl" />
      {parentStep ? (
        <>
          <h1 className="text-2xl">Welkom, ouder of verzorger 💛</h1>
          <div className="space-y-2 text-left text-sm text-muted-foreground">
            <p>Je krijgt een eigen omgeving voor ouders, met elke dag:</p>
            <ul className="list-inside list-disc space-y-1">
              <li>een klein opdrachtje voor jezelf</li>
              <li>een tip om je kind te laten merken dat je er bent</li>
              <li>je eigen stemming bijhouden en rustmomenten</li>
            </ul>
            <p>
              Je ziet niets van de groepen, chats of gegevens van jongeren, ook niet van je eigen kind.
              Zo blijft het voor iedereen een veilige plek.
            </p>
            <p className="rounded-2xl bg-muted p-3">
              <b>Ben je zelf tussen de 13 en 27 jaar en ook ouder?</b> Ga dan terug en vul je geboortedatum in. Je komt
              in de groepen van je leeftijd, en kunt daarna bij je profiel de ouderhoek aanzetten.
            </p>
          </div>
          <Button disabled={busy} onClick={becomeParent} className="h-12 w-64 rounded-full">
            {busy ? "Bezig…" : "Ja, ik ben ouder of verzorger"}
          </Button>
          <button onClick={() => setParentStep(false)} className="text-sm text-muted-foreground underline">
            Terug
          </button>
        </>
      ) : tooYoung ? (
        <>
          <h1 className="text-2xl">Nog even geduld 💛</h1>
          <p className="text-sm text-muted-foreground">
            CeritaProject is voor jongeren vanaf 13 jaar. Kom terug als je 13 bent!
          </p>
          <Button variant="outline" className="rounded-full" onClick={() => setTooYoung(false)}>
            Datum verbeteren
          </Button>
          <button onClick={signOut} className="text-sm text-muted-foreground underline">
            Uitloggen
          </button>
        </>
      ) : (
        <>
          <h1 className="text-2xl">Wanneer ben je jarig? 🎂</h1>
          <p className="text-sm text-muted-foreground">
            We vragen je geboortedatum zodat je in de groep komt met leeftijdsgenoten, en alleen
            verhalen ziet die bij jouw leeftijd passen. Andere leden zien hem niet.
          </p>
          <Input
            type="date"
            aria-label="Geboortedatum"
            value={date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
            className="h-12 w-64 rounded-2xl"
          />
          <Button disabled={!date || busy} onClick={save} className="h-12 w-64 rounded-full">
            {busy ? "Bezig…" : "Verder"}
          </Button>
          <button onClick={() => setParentStep(true)} className="text-sm font-semibold text-primary underline">
            Ik ben ouder of verzorger
          </button>
          <p className="max-w-xs text-xs text-muted-foreground">
            Let op: je kunt je geboortedatum daarna niet zelf meer veranderen. Klopt hij niet? Vraag
            het een beheerder.
          </p>
        </>
      )}
    </div>
  );
}
