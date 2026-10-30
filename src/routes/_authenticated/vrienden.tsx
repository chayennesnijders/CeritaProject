import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useMe, ageGroupFor, bandLabel } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { notifyChatRequest } from "@/lib/push.functions";

export const Route = createFileRoute("/_authenticated/vrienden")({
  head: () => ({ meta: [{ title: "Vrienden zoeken — CeritaProject" }, { name: "description", content: "Vind nieuwe vrienden binnen je leeftijdsgroep op CeritaProject." }, { property: "og:title", content: "Vrienden zoeken — CeritaProject" }, { property: "og:description", content: "Vind nieuwe vrienden binnen je leeftijdsgroep op CeritaProject." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: FriendsPage,
});

function FriendsPage() {
  const { data: me } = useMe();
  const uid = me?.user.id;
  const nav = useNavigate();
  const qc = useQueryClient();
  const notify = useServerFn(notifyChatRequest);
  const [q, setQ] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const band = me?.profile?.birthdate ? ageGroupFor(new Date(me.profile.birthdate)) : null;

  const ownBand = band === "junior" || band === "senior" || band === "adult" ? band : null;
  const { data, isLoading } = useQuery({
    queryKey: ["vrienden", uid],
    enabled: !!uid && !!ownBand,
    queryFn: async () => {
      const [p, c, b] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name, username, allow_messages, avatar_url, age_group, bio")
          .neq("id", uid!)
          .eq("age_group", ownBand!)
          .order("display_name"),
        supabase.from("conversations").select("id, user_a, user_b, status, requested_by"),
        supabase.from("blocks").select("blocker_id, blocked_id").or(`blocker_id.eq.${uid},blocked_id.eq.${uid}`),
      ]);
      const blocked = new Set(
        (b.data ?? []).map((x) => (x.blocker_id === uid ? x.blocked_id : x.blocker_id)),
      );
      const people = (p.data ?? []).filter((x) => x.allow_messages && !blocked.has(x.id));
      const convByOther = new Map(
        (c.data ?? []).map((x) => [x.user_a === uid ? x.user_b : x.user_a, x]),
      );
      return { people, convByOther };
    },
  });

  if (band === "no_community")
    return (
      <div className="pt-2">
        <h1 className="text-3xl">Vrienden zoeken</h1>
        <div className="mt-4 rounded-3xl bg-card p-5 text-sm shadow-soft">
          Vrienden zoeken is voor leden tot en met 27 jaar. Je verhalen, je diertje en de rest van de app blijven gewoon beschikbaar.
        </div>
      </div>
    );
  if (!me?.profile?.birthdate)
    return <p className="pt-6 text-sm text-muted-foreground">Vul eerst je geboortedatum in op je profiel.</p>;

  async function start(other: string) {
    const existing = data?.convByOther.get(other);
    if (existing) {
      if (existing.status === "accepted") return nav({ to: "/berichten/$id", params: { id: existing.id } });
      return toast("Er loopt al een verzoek tussen jullie.");
    }
    const [a, b] = [uid!, other].sort();
    const { data: created, error } = await supabase
      .from("conversations")
      .insert({ user_a: a!, user_b: b!, requested_by: uid! })
      .select("id")
      .single();
    if (error) {
      toast.error("Je kunt deze persoon (nu) geen bericht sturen.");
      return;
    }
    notify({ data: { convId: created.id } }).catch(() => {});
    setSentTo(other);
    toast.success("Verzoek verstuurd! Zodra de ander accepteert, kunnen jullie chatten.");
    qc.invalidateQueries({ queryKey: ["vrienden", uid] });
  }

  const needle = q.trim().toLowerCase().replace(/^@/, "");
  const all = data?.people ?? [];
  const matches = needle
    ? all.filter((p) => p.display_name.toLowerCase().includes(needle) || (p.username ?? "").includes(needle))
    : all;

  return (
    <div className="space-y-4 pt-2">
      <div>
        <h1 className="text-3xl">Vrienden zoeken 💛</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hier zie je leden van {bandLabel(band!)} jaar — jouw eigen groep. Stuur een chatverzoek om kennis te maken.
        </p>
      </div>
      <Input
        placeholder="Zoek op naam of @gebruikersnaam…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="rounded-2xl"
      />
      {isLoading && <p className="text-sm text-muted-foreground">Even laden…</p>}
      {!isLoading && matches.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {needle ? "Niemand gevonden. Probeer een andere naam." : "Nog geen andere leden in jouw groep."}
        </p>
      )}
      <div className="space-y-2">
        {matches.map((p) => {
          const conv = data?.convByOther.get(p.id);
          const pending = conv?.status === "pending";
          const accepted = conv?.status === "accepted";
          return (
            <div key={p.id} className="flex items-center gap-3 rounded-3xl bg-card p-4 shadow-soft">
              <UserAvatar path={p.avatar_url} name={p.display_name} userId={p.id} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {p.display_name}
                  {p.username && <span className="ml-1 text-xs font-normal text-muted-foreground">@{p.username}</span>}
                </p>
                {p.bio && <p className="truncate text-xs text-muted-foreground">{p.bio}</p>}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="shrink-0 rounded-full text-lg"
                aria-label={`Compliment sturen aan ${p.display_name}`}
                onClick={() => nav({ to: "/complimenten", search: { aan: p.id } })}
              >
                💐
              </Button>
              {accepted ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => nav({ to: "/berichten/$id", params: { id: conv!.id } })}
                >
                  Chat 💬
                </Button>
              ) : pending || sentTo === p.id ? (
                <span className="text-xs text-muted-foreground">Verstuurd ✓</span>
              ) : (
                <Button size="sm" className="rounded-full" onClick={() => start(p.id)}>
                  Verzoek
                </Button>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        De ander krijgt een melding en kiest zelf of het gesprek doorgaat. Zie je iets geks? Meld het bij een beheerder.
      </p>
    </div>
  );
}
