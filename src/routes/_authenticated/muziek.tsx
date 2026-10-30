import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { DiscoverTabs } from "@/components/DiscoverTabs";
import { MusicPlayer } from "@/components/MusicPlayer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { songTipError } from "@/lib/music";

export const Route = createFileRoute("/_authenticated/muziek")({
  head: () => ({
    meta: [
      { title: "Muziek — CeritaProject" },
      {
        name: "description",
        content: "Playlists voor elk gevoel en liedjestips van leden van jouw leeftijd.",
      },
    ],
  }),
  component: MusicPage,
});

function MusicPage() {
  const { data: me } = useMe();
  const uid = me?.user.id;
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: playlists = [] } = useQuery({
    queryKey: ["playlists"],
    queryFn: async () =>
      (await supabase.from("playlists").select("*").order("sort").order("created_at")).data ?? [],
  });
  const { data: tips = [] } = useQuery({
    queryKey: ["song-tips", uid],
    enabled: !!uid && !!me?.profile?.age_group,
    queryFn: async () => {
      const [t, l] = await Promise.all([
        supabase
          .from("song_tips")
          .select("id, user_id, title, artist, url, created_at, author:profiles(display_name)")
          .eq("hidden", false)
          // Admins can see every band, but here they also only see their own (like the community).
          .eq("age_group", me!.profile!.age_group)
          .order("created_at", { ascending: false })
          .limit(60),
        supabase.from("song_tip_likes").select("tip_id, user_id"),
      ]);
      return (t.data ?? []).map((x) => ({
        ...x,
        likes: (l.data ?? []).filter((y) => y.tip_id === x.id).length,
        liked: (l.data ?? []).some((y) => y.tip_id === x.id && y.user_id === uid),
      }));
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["song-tips"] });
  const error = title || artist || url ? songTipError(title, artist, url) : null;

  async function share() {
    setBusy(true);
    const { error: err } = await supabase.rpc("add_song_tip", {
      _title: title,
      _artist: artist,
      _url: url.trim(),
    });
    setBusy(false);
    if (err) {
      toast.error(err.message);
      return;
    }
    setTitle("");
    setArtist("");
    setUrl("");
    toast.success("Gedeeld! 🎶");
    refresh();
  }
  async function like(id: string, liked: boolean) {
    if (!uid) return;
    const { error: err } = liked
      ? await supabase.from("song_tip_likes").delete().eq("tip_id", id).eq("user_id", uid)
      : await supabase.from("song_tip_likes").insert({ tip_id: id, user_id: uid });
    if (err) toast.error("Dat lukte niet.");
    refresh();
  }
  async function remove(id: string) {
    const { error: err } = await supabase.from("song_tips").delete().eq("id", id);
    if (err) toast.error("Weghalen lukte niet.");
    refresh();
  }

  return (
    <div className="space-y-5 pt-2">
      <div>
        <h1 className="text-3xl">Ontdekken</h1>
        <DiscoverTabs active="muziek" />
      </div>

      <section className="space-y-3">
        <h2 className="text-xl">🎧 Playlists voor elk gevoel</h2>
        {playlists.length === 0 && (
          <p className="rounded-3xl bg-card p-4 text-sm text-muted-foreground shadow-soft">
            Hier komen binnenkort playlists van CeritaProject. Deel ondertussen hieronder je eigen
            favoriete liedjes!
          </p>
        )}
        {playlists.map((p) => (
          <div key={p.id} className="space-y-3 rounded-3xl bg-card p-4 shadow-soft">
            <div className="flex items-center gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary text-2xl">
                {p.emoji}
              </span>
              <div className="min-w-0">
                <p className="font-semibold">{p.title}</p>
                {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
              </div>
            </div>
            <MusicPlayer url={p.url} />
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-xl">💬 Liedjestips</h2>
          <p className="text-xs text-muted-foreground">
            Van leden van jouw leeftijd. Welk liedje maakt jou blij?
          </p>
        </div>
        <div className="space-y-2 rounded-3xl bg-card p-4 shadow-soft">
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={title}
              maxLength={80}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titel"
              className="rounded-2xl"
            />
            <Input
              value={artist}
              maxLength={80}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Artiest"
              className="rounded-2xl"
            />
          </div>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Link van Spotify, YouTube of Apple Music (mag leeg)"
            className="rounded-2xl"
            inputMode="url"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button
            disabled={busy || !title || !artist || !!error}
            onClick={share}
            className="w-full rounded-full"
          >
            🎶 Deel dit liedje
          </Button>
        </div>
        {tips.length === 0 && (
          <p className="text-sm text-muted-foreground">Nog geen tips. Wees de eerste!</p>
        )}
        {tips.map((t) => (
          <div key={t.id} className="space-y-2 rounded-3xl bg-card p-4 shadow-soft">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🎵</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{t.title}</p>
                <p className="truncate text-sm text-muted-foreground">{t.artist}</p>
                <p className="text-[11px] text-muted-foreground">
                  Tip van{" "}
                  {t.user_id === uid
                    ? "jou"
                    : ((t.author as { display_name?: string } | null)?.display_name ?? "een lid")}
                </p>
              </div>
              <button
                onClick={() => like(t.id, t.liked)}
                aria-label={t.liked ? "Niet meer leuk" : "Leuk"}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm ${t.liked ? "bg-primary text-primary-foreground" : "bg-muted"}`}
              >
                {t.liked ? "❤️" : "🤍"} {t.likes}
              </button>
              {(t.user_id === uid || me?.isAdmin) && (
                <button
                  onClick={() => remove(t.id)}
                  aria-label="Weghalen"
                  className="p-1 text-muted-foreground"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
            {t.url && <MusicPlayer url={t.url} label="Afspelen" />}
          </div>
        ))}
      </section>
    </div>
  );
}
