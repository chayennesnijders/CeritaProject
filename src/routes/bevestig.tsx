import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Riti } from "@/components/Riti";
import { Button } from "@/components/ui/button";
import { confirmError, confirmKind, readConfirmLink, type ConfirmType } from "@/lib/confirm-link";

export const Route = createFileRoute("/bevestig")({
  head: () => ({ meta: [{ title: "Bevestigen — CeritaProject" }] }),
  component: ConfirmPage,
});

/**
 * Where the links in our emails land. The one-time code is only used when the member taps the
 * button, so mail apps that open links to scan them can no longer use it up. Public page: it must
 * work without being logged in.
 */
function ConfirmPage() {
  const nav = useNavigate();
  const [link, setLink] = useState<{ tokenHash: string; type: ConfirmType } | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setLink(readConfirmLink(window.location.search)), []);

  if (link === undefined) return null;
  if (!link)
    return (
      <Shell title="Deze link klopt niet">
        <p className="text-sm text-muted-foreground">Open de link nog een keer vanuit de mail, of log gewoon in.</p>
        <Link to="/auth" className="inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          Naar inloggen
        </Link>
      </Shell>
    );

  const kind = confirmKind(link.type);
  async function confirm() {
    if (!link) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.verifyOtp({ token_hash: link.tokenHash, type: link.type });
    setBusy(false);
    if (err) {
      setError(confirmError(err.message, link.type));
      return;
    }
    toast.success(kind.done);
    void nav({ to: kind.next, replace: true });
  }

  return (
    <Shell title={kind.title}>
      <p className="text-sm text-muted-foreground">Tik op de knop om verder te gaan.</p>
      <Button disabled={busy} onClick={() => void confirm()} className="h-12 w-full rounded-full text-base">
        {busy ? "Even geduld…" : kind.button}
      </Button>
      {error && (
        <div role="alert" className="space-y-2 rounded-2xl bg-destructive/10 p-3 text-sm">
          <p>⚠️ {error}</p>
          <Link to="/auth" className="font-semibold text-primary underline">
            {link.type === "recovery" ? "Nieuwe link aanvragen" : "Naar inloggen"}
          </Link>
        </div>
      )}
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <Riti size={130} expression="blij" />
      <h1 className="text-3xl">{title}</h1>
      <div className="w-full space-y-3">{children}</div>
    </div>
  );
}
