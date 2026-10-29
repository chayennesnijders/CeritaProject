import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { challengeDay } from "@/lib/challenges";
import { ageOn, consentNeeded } from "@/lib/consent";
import { LEGAL_VERSION } from "@/lib/legal";
import { Riti } from "@/components/Riti";
import { Button } from "@/components/ui/button";

/**
 * Before using the app: agree to the house rules and privacy statement (again after a change),
 * and under 16 confirm that a parent or carer knows. Lets the app through if the consent table is not there yet.
 */
export function ConsentGate({ children }: { children: React.ReactNode }) {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const uid = me?.user.id;
  const {
    data: consent,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["consent", uid],
    enabled: !!uid,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_consents")
        .select("terms_version, parent_confirmed_at")
        .eq("user_id", uid!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [rules, setRules] = useState(false);
  const [parent, setParent] = useState(false);
  const [busy, setBusy] = useState(false);

  const age = me?.profile?.birthdate ? ageOn(me.profile.birthdate, challengeDay()) : null;
  const needed =
    !uid || isLoading || isError ? null : consentNeeded(consent ?? null, LEGAL_VERSION, age);
  if (!needed) return <>{children}</>;

  async function save() {
    if (!uid) return;
    setBusy(true);
    const now = new Date().toISOString();
    const { error } = await supabase.from("user_consents").upsert(
      {
        user_id: uid,
        terms_version: LEGAL_VERSION,
        terms_accepted_at: now,
        parent_confirmed_at: needed!.parent ? now : (consent?.parent_confirmed_at ?? null),
      },
      { onConflict: "user_id" },
    );
    setBusy(false);
    if (error) {
      toast.error("Opslaan lukte niet. Probeer het opnieuw.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["consent", uid] });
  }

  const ready = (!needed.terms || rules) && (!needed.parent || parent);
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 bg-background px-6 py-10">
      <Riti size={130} expression="blij" />
      <h1 className="text-center text-2xl">
        {needed.terms ? "Even onze afspraken 💛" : "Nog één vraagje 💛"}
      </h1>
      {needed.terms && (
        <div className="w-full space-y-2 rounded-3xl bg-card p-5 text-sm shadow-soft">
          <p className="font-semibold">Het belangrijkste in het kort:</p>
          <ul className="space-y-1.5">
            <li>💛 We zijn lief voor elkaar. Pesten en schelden mag niet.</li>
            <li>🔒 Deel geen adres, school of telefoonnummer.</li>
            <li>
              👀 Alleen leeftijdsgenoten zien wat je in een groep zet. Je dagboek ziet niemand.
            </li>
            <li>
              🆘 Schrijf je over zelfmoord of jezelf pijn doen? Dan kijkt een beheerder mee, zodat
              iemand je kan helpen.
            </li>
            <li>🚫 We verkopen je gegevens nooit en er is geen reclame.</li>
          </ul>
          <p className="pt-1">
            Lees alles in de{" "}
            <Link to="/huisregels" className="text-primary underline">
              huisregels
            </Link>
            , de{" "}
            <Link to="/privacy" className="text-primary underline">
              privacyverklaring
            </Link>{" "}
            en de{" "}
            <Link to="/voorwaarden" className="text-primary underline">
              voorwaarden
            </Link>
            .
          </p>
          <label className="flex items-start gap-3 rounded-2xl bg-muted p-3">
            <input
              type="checkbox"
              checked={rules}
              onChange={(e) => setRules(e.target.checked)}
              className="mt-0.5 size-5 accent-primary"
            />
            <span>Ik heb het gelezen en ga akkoord.</span>
          </label>
        </div>
      )}
      {needed.parent && (
        <div className="w-full space-y-2 rounded-3xl bg-card p-5 text-sm shadow-soft">
          <p>
            Je bent jonger dan 16. Dan moet je ouder of verzorger het goed vinden dat je
            CeritaProject gebruikt. Laat ze de pagina{" "}
            <Link to="/ouders" className="text-primary underline">
              Voor ouders
            </Link>{" "}
            zien, daar lezen ze wat CeritaProject is.
          </p>
          <label className="flex items-start gap-3 rounded-2xl bg-muted p-3">
            <input
              type="checkbox"
              checked={parent}
              onChange={(e) => setParent(e.target.checked)}
              className="mt-0.5 size-5 accent-primary"
            />
            <span>
              Mijn ouder of verzorger weet dat ik CeritaProject gebruik en vindt het goed.
            </span>
          </label>
        </div>
      )}
      <Button disabled={!ready || busy} onClick={save} className="h-12 w-full rounded-full">
        {busy ? "Bezig…" : "Verder"}
      </Button>
    </div>
  );
}
