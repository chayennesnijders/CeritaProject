import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { kindInfo } from "@/lib/discover";
import { visibleGroups } from "@/lib/groups";
import { matches, searchTerm } from "@/lib/search";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/zoeken")({
  head: () => ({
    meta: [
      { title: "Zoeken — CeritaProject" },
      {
        name: "description",
        content: "Zoek in verhalen, artikelen, groepen, podcasts en playlists.",
      },
    ],
  }),
  component: SearchPage,
});

/** One search box for stories, articles, groups, things to listen to and playlists. */
function SearchPage() {
  const { data: me } = useMe();
  const [q, setQ] = useState("");
  const [term, setTerm] = useState<string | null>(null);
  // Search a moment after typing stops.
  useEffect(() => {
    const t = setTimeout(() => setTerm(searchTerm(q)), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isFetching } = useQuery({
    queryKey: ["search", term],
    enabled: !!term,
    queryFn: async () => {
      const like = `%${term}%`;
      const [a, g, m, p] = await Promise.all([
        supabase
          .from("articles")
          .select("id, title, kind, emoji")
          .or(`title.ilike.${like},body.ilike.${like}`)
          .limit(20),
        supabase
          .from("groups")
          .select("id, name, emoji, description, age_group")
          .eq("is_archived", false)
          .ilike("name", like)
          .limit(10),
        supabase
          .from("media_items")
          .select("id, title")
          .lte("publish_at", new Date().toISOString())
          .ilike("title", like)
          .limit(10),
        supabase.from("playlists").select("id, title, emoji").ilike("title", like).limit(10),
      ]);
      return {
        articles: a.data ?? [],
        // Like the community page: only groups of your own age band.
        groups: visibleGroups(g.data ?? [], {
          ageGroup: me?.profile?.age_group,
          isAdmin: me?.isAdmin,
        }),
        media: m.data ?? [],
        playlists: p.data ?? [],
      };
    },
  });
  const total = data
    ? data.articles.length + data.groups.length + data.media.length + data.playlists.length
    : 0;

  return (
    <div className="space-y-4 pt-2">
      <h1 className="text-3xl">🔍 Zoeken</h1>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Bijvoorbeeld: faalangst, vriendschap, gamen…"
          className="h-12 rounded-full pl-11"
          type="search"
        />
      </div>
      {!term && <p className="text-sm text-muted-foreground">Typ minstens 2 letters.</p>}
      {term && isFetching && !data && <p className="text-sm text-muted-foreground">Zoeken…</p>}
      {term && data && total === 0 && (
        <p className="text-sm text-muted-foreground">
          Niets gevonden voor “{term}”. Probeer een ander woord.
        </p>
      )}
      {data && data.articles.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg">📖 Verhalen en artikelen</h2>
          {data.articles
            .sort((x, y) => Number(matches(y.title, term!)) - Number(matches(x.title, term!)))
            .map((a) => (
              <Link
                key={a.id}
                to="/ontdekken/$articleId"
                params={{ articleId: a.id }}
                className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-soft"
              >
                <span className="text-2xl">{a.emoji ?? kindInfo(a.kind).emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{a.title}</span>
                  <span className="text-xs text-muted-foreground">{kindInfo(a.kind).one}</span>
                </span>
              </Link>
            ))}
        </section>
      )}
      {data && data.groups.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg">💬 Groepen</h2>
          {data.groups.map((g) => (
            <Link
              key={g.id}
              to="/community/$groupId"
              params={{ groupId: g.id }}
              className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-soft"
            >
              <span className="text-2xl">{g.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{g.name}</span>
                {g.description && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {g.description}
                  </span>
                )}
              </span>
            </Link>
          ))}
        </section>
      )}
      {data && data.media.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg">🎧 Luisteren en kijken</h2>
          {data.media.map((m) => (
            <Link
              key={m.id}
              to="/luisteren/$mediaId"
              params={{ mediaId: m.id }}
              className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-soft"
            >
              <span className="text-2xl">🎙️</span>
              <span className="truncate font-semibold">{m.title}</span>
            </Link>
          ))}
        </section>
      )}
      {data && data.playlists.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg">🎵 Playlists</h2>
          {data.playlists.map((p) => (
            <Link
              key={p.id}
              to="/muziek"
              className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-soft"
            >
              <span className="text-2xl">{p.emoji}</span>
              <span className="truncate font-semibold">{p.title}</span>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
