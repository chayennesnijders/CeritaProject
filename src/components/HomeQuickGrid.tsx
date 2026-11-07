import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTodayChallenge } from "@/lib/challenges";
import { CARE_ACTIONS, petDay, speciesEmoji } from "@/lib/pet";
import { useUnreadCounts } from "@/lib/unread";
import { useDiscover } from "@/lib/use-discover";
import { ofKind } from "@/lib/discover";

type Tile = {
  to: string;
  emoji: string;
  label: string;
  status: string;
  tint: string;
  /** Something is waiting: the tile gets a dot and a soft bounce. */
  attention?: boolean;
};

/**
 * Home: everything you can do, at a glance. Each tile says in a few words what is waiting there
 * (your pet still wants food, 3 new messages in your groups, today's assignment is done).
 */
export function HomeQuickGrid({ uid }: { uid: string | undefined }) {
  const today = petDay();
  const { data: pet } = useQuery({
    queryKey: ["pet", uid],
    enabled: !!uid,
    queryFn: async () => (await supabase.from("pets").select("*").eq("user_id", uid!).maybeSingle()).data,
  });
  const { data: careToday = [] } = useQuery({
    queryKey: ["pet-care-today", uid, today],
    enabled: !!uid,
    queryFn: async () =>
      (await supabase.from("pet_care").select("action").eq("user_id", uid!).eq("care_date", today)).data ?? [],
  });
  const { data: challenge } = useTodayChallenge();
  const { data: challengeDone = false } = useQuery({
    queryKey: ["challenge-done", uid, challenge?.id],
    enabled: !!uid && !!challenge?.id,
    queryFn: async () => {
      const { count } = await supabase
        .from("diary_entries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid!)
        .eq("challenge_id", challenge!.id);
      return (count ?? 0) > 0;
    },
  });
  const unread = useUnreadCounts();
  const { stories, read } = useDiscover(uid);
  const newStories = ofKind(stories, "verhaal").filter((s) => !read.has(s.id)).length;

  const careLeft = CARE_ACTIONS.filter((a) => !careToday.some((c) => c.action === a.id)).length;
  const tiles: Tile[] = [
    pet
      ? {
          to: "/diertje",
          emoji: speciesEmoji(pet.species),
          label: pet.name,
          status: careLeft ? `Wil nog ${careLeft}× aandacht` : "Superblij 💖",
          tint: "bg-[#fde4ea] dark:bg-[#4a2c35]",
          attention: careLeft > 0,
        }
      : { to: "/diertje", emoji: "🥚", label: "Diertje", status: "Adopteer er een!", tint: "bg-[#fde4ea] dark:bg-[#4a2c35]", attention: true },
    {
      to: "/dagboek",
      emoji: challengeDone ? "✅" : "✍️",
      label: "Opdracht",
      status: challengeDone ? "Gedaan!" : "Van vandaag",
      tint: "bg-[#f6ead9] dark:bg-[#3a2d26]",
      attention: !challengeDone,
    },
    { to: "/dagboek", emoji: "📔", label: "Dagboek", status: "Alleen voor jou", tint: "bg-[#f6ead9] dark:bg-[#3a2d26]" },
    {
      to: "/community",
      emoji: "👥",
      label: "Groepen",
      status: unread.groupTotal ? `${unread.groupTotal} nieuw` : "Praat mee",
      tint: "bg-[#e3f1e8] dark:bg-[#1f3a2c]",
      attention: unread.groupTotal > 0,
    },
    {
      to: "/ontdekken",
      emoji: "📖",
      label: "Verhalen",
      status: newStories ? `${newStories} nog niet gelezen` : "Lees of swipe",
      tint: "bg-[#e6eefb] dark:bg-[#22304a]",
    },
    { to: "/ceritabuddy", emoji: "💬", label: "CeritaBuddy", status: "Praat het van je af", tint: "bg-[#ece6fb] dark:bg-[#2f2747]" },
    { to: "/rust", emoji: "🫧", label: "Rust", status: "2 minuten ademen", tint: "bg-[#e6eefb] dark:bg-[#22304a]" },
    { to: "/vragen", emoji: "🎓", label: "Coach", status: "Stel een vraag", tint: "bg-[#e3f1e8] dark:bg-[#1f3a2c]" },
    { to: "/hulp", emoji: "🆘", label: "Hulp", status: "Nu iemand nodig?", tint: "bg-[#fde4e4] dark:bg-[#4a2626]" },
  ];

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Wat wil je doen?</h2>
      <div className="grid grid-cols-3 gap-2.5">
        {tiles.map((t) => (
          <Link
            key={t.label}
            to={t.to}
            className={`group relative flex flex-col items-center rounded-3xl px-1.5 py-3 text-center shadow-soft transition-transform active:scale-95 ${t.tint}`}
          >
            {t.attention && (
              <span aria-hidden className="absolute right-2 top-2 size-2.5 rounded-full bg-primary ring-2 ring-background" />
            )}
            <span
              className={`text-3xl transition-transform group-hover:-rotate-6 group-hover:scale-110 ${t.attention ? "motion-safe:animate-[bounce_2s_ease-in-out_infinite]" : ""}`}
            >
              {t.emoji}
            </span>
            <span className="mt-1 w-full truncate text-sm font-semibold">{t.label}</span>
            <span className="w-full truncate text-[11px] leading-tight text-muted-foreground">{t.status}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
