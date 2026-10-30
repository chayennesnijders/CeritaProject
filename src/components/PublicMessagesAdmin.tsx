import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { senderLabel } from "@/lib/contact-form";
import { Button } from "@/components/ui/button";

/** Beheer → Berichten: questions from the public contact form (parents, organisations). Answer by e-mail. */
export function PublicMessagesAdmin() {
  const qc = useQueryClient();
  const [showDone, setShowDone] = useState(false);
  const { data: rows = [] } = useQuery({
    queryKey: ["public-messages"],
    refetchInterval: 60_000,
    queryFn: async () =>
      (
        await supabase
          .from("public_messages")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200)
      ).data ?? [],
  });
  const open = rows.filter((r) => r.status === "nieuw");
  const shown = showDone ? rows : open;

  async function setStatus(id: string, status: "nieuw" | "afgehandeld") {
    const { error } = await supabase.from("public_messages").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["public-messages"] });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg">
          📬 Van ouders en organisaties{" "}
          {open.length > 0 && <span className="text-sm text-primary">({open.length} nieuw)</span>}
        </h2>
        <button className="text-xs text-primary underline" onClick={() => setShowDone(!showDone)}>
          {showDone ? "Alleen nieuwe" : "Alles"}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Via het contactformulier op de website. Je antwoordt per e-mail.
      </p>
      {shown.length === 0 && (
        <p className="rounded-3xl bg-card p-4 text-center text-sm text-muted-foreground shadow-soft">
          Geen nieuwe berichten.
        </p>
      )}
      {shown.map((m) => (
        <div key={m.id} className="space-y-2 rounded-3xl bg-card p-4 text-sm shadow-soft">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="font-semibold">
              {senderLabel(m.sender_type)} ·{" "}
              {new Date(m.created_at).toLocaleString("nl-NL", {
                timeZone: "Europe/Amsterdam",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {m.status === "afgehandeld" && (
              <span className="rounded-full bg-muted px-2 py-0.5">✓ Afgehandeld</span>
            )}
          </div>
          <p className="font-semibold">
            {m.name}
            {m.organisation && (
              <span className="font-normal text-muted-foreground"> · {m.organisation}</span>
            )}
          </p>
          <p className="whitespace-pre-wrap">{m.body}</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" className="rounded-full">
              <a
                href={`mailto:${m.email}?subject=${encodeURIComponent("Re: je bericht aan CeritaProject")}`}
              >
                ✉️ Antwoord naar {m.email}
              </a>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => setStatus(m.id, m.status === "nieuw" ? "afgehandeld" : "nieuw")}
            >
              {m.status === "nieuw" ? "✓ Afgehandeld" : "Terug naar nieuw"}
            </Button>
          </div>
        </div>
      ))}
    </section>
  );
}
