import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { normalizeUsername, usernameProblem } from "@/lib/username";
import { Button } from "@/components/ui/button";

/**
 * Everyone needs a username (@naam), not just a name: it is how others find you for a buddy,
 * a chat or a mention. Members without one choose it here before using the app.
 */
export function UsernameGate({ children }: { children: React.ReactNode }) {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!me?.profile || me.profile.username) return <>{children}</>;
  const profileId = me.profile.id;

  async function save() {
    const problem = usernameProblem(value);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    const { error: err } = await supabase
      .from("profiles")
      .update({ username: value })
      .eq("id", profileId);
    setBusy(false);
    if (err) {
      setError(
        err.code === "23505"
          ? "Deze gebruikersnaam is al bezet. Probeer een andere."
          : "Opslaan lukte niet. Probeer het opnieuw.",
      );
      return;
    }
    toast.success(`Welkom, @${value}! 🎉`);
    qc.invalidateQueries({ queryKey: ["me"] });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <img src="/cerita-logo.png" alt="CeritaProject" className="size-28 rounded-3xl" />
      <h1 className="text-2xl">Kies je gebruikersnaam</h1>
      <p className="text-sm text-muted-foreground">
        Naast je naam heeft iedereen een eigen <strong>gebruikersnaam</strong>. Daarmee kunnen
        anderen je vinden als buddy of in een chat.
      </p>
      <div className="w-full max-w-xs rounded-2xl bg-card p-3 text-left text-xs shadow-soft">
        <p>
          <span className="font-semibold">Naam:</span> {me.profile.display_name || "Sam"}{" "}
          <span className="text-muted-foreground">(mag dubbel voorkomen)</span>
        </p>
        <p className="mt-1">
          <span className="font-semibold">Gebruikersnaam:</span> @{value || "jouwnaam"}{" "}
          <span className="text-muted-foreground">(alleen van jou)</span>
        </p>
      </div>
      <label className="flex h-12 w-64 items-center rounded-2xl border border-input bg-background px-3">
        <span className="text-muted-foreground">@</span>
        <input
          aria-label="Gebruikersnaam"
          autoFocus
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          maxLength={20}
          placeholder="jouwnaam"
          onChange={(e) => {
            setValue(normalizeUsername(e.target.value));
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && void save()}
          className="h-full flex-1 bg-transparent px-1 outline-none"
        />
      </label>
      {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
      <Button disabled={busy || value.length < 3} onClick={save} className="h-12 w-64 rounded-full">
        {busy ? "Bezig…" : "Verder"}
      </Button>
      <p className="max-w-xs text-xs text-muted-foreground">
        3 tot 20 tekens: letters, cijfers, _ en . Kies liever niet je echte achternaam. Je kunt hem
        later veranderen bij Profiel.
      </p>
    </div>
  );
}
