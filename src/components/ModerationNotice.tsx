import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";

/** Toont het lid een actieve waarschuwing of time-out van een beheerder. */
export function ModerationNotice() {
  const { data: me } = useMe();
  const { data } = useQuery({
    queryKey: ["moderation", me?.user.id],
    enabled: !!me?.user,
    refetchInterval: 15000,
    queryFn: async () => {
      const uid = me?.user.id;
      if (!uid) return { warning: null, timeout: null, responses: [] };
      const [w, t, r] = await Promise.all([
        supabase.from("member_warnings").select("message, created_at").order("created_at", { ascending: false }).limit(1),
        supabase.from("member_timeouts").select("until, reason").gt("until", new Date().toISOString()).order("until", { ascending: false }).limit(1),
        supabase.from("reports").select("id, reason, response, status, responded_at").eq("reporter_id", uid).not("responded_at", "is", null).order("responded_at", { ascending: false }).limit(5),
      ]);
      return { warning: w.data?.[0] ?? null, timeout: t.data?.[0] ?? null, responses: r.data ?? [] };
    },
  });
  if (!data?.warning && !data?.timeout && !data?.responses.length) return null;
  return (
    <div className="space-y-2">
      {data.responses.map((r) => (
        <article key={r.id} className="rounded-lg border border-border bg-card p-4 text-sm">
          <h2 className="text-sm font-bold">{r.status === "afgewezen" ? "Je melding is afgekeurd" : "Antwoord op je melding"}</h2>
          <p className="mt-1 break-words text-xs text-muted-foreground">Je melding: {r.reason}</p>
          <p className="mt-2 whitespace-pre-wrap break-words">{r.response}</p>
          {r.responded_at && <p className="mt-2 text-xs text-muted-foreground">{new Date(r.responded_at).toLocaleString("nl-NL")}</p>}
        </article>
      ))}
      {data.timeout && (
        <div className="rounded-3xl border-2 border-ink bg-card p-4 text-sm shadow-hard">
          <p className="font-extrabold">⏸️ Je hebt een time-out</p>
          <p className="mt-1">
            Tot {new Date(data.timeout.until).toLocaleString("nl-NL")} kun je niet in groepen posten.
            {data.timeout.reason ? ` Reden: ${data.timeout.reason}` : ""}
          </p>
        </div>
      )}
      {data.warning && (
        <div className="rounded-3xl border-2 border-ink bg-card p-4 text-sm shadow-hard">
          <p className="font-extrabold">⚠️ Bericht van de beheerders</p>
          <p className="mt-1">{data.warning.message}</p>
        </div>
      )}
    </div>
  );
}
