import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ageGroupFor, useMe } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConsentGate } from "@/components/ConsentGate";

/**
 * Everyone needs a birthdate (it decides your age group and which stories you see).
 * Members without one (e.g. signed up with Google) fill it in here before using the app.
 */
export function BirthdateGate({ children }: { children: React.ReactNode }) {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [tooYoung, setTooYoung] = useState(false);

  if (!me?.profile || me.profile.birthdate) return <ConsentGate>{children}</ConsentGate>;

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
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/", replace: true });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <img src="/cerita-logo.png" alt="CeritaProject" className="size-28 rounded-3xl" />
      {tooYoung ? (
        <>
          <h1 className="text-2xl">Nog even geduld 💛</h1>
          <p className="text-sm text-muted-foreground">
            CeritaProject is voor jongeren vanaf 12 jaar. Kom terug als je 12 bent!
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
          <p className="max-w-xs text-xs text-muted-foreground">
            Let op: je kunt je geboortedatum daarna niet zelf meer veranderen. Klopt hij niet? Vraag
            het een beheerder.
          </p>
        </>
      )}
    </div>
  );
}
