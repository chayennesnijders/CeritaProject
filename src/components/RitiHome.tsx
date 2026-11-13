import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Riti } from "@/components/Riti";
import { challengeDay, useTodayChallenge } from "@/lib/challenges";
import { CARE_ACTIONS, petDay, speciesEmoji } from "@/lib/pet";
import { useUnreadCounts } from "@/lib/unread";
import { useDiscover } from "@/lib/use-discover";
import { ofKind, storyOfTheDay } from "@/lib/discover";
import { useInbox } from "@/lib/use-inbox";
import { celebrate } from "@/lib/celebrate";
import { ritiFor } from "@/lib/riti";
import { ritiToday } from "@/lib/riti-today";
import { MOODS, affirmationFor, dutchHour, greeting, moodById, needsHelpLine, type MoodId } from "@/lib/home";

/**
 * The home screen with Riti in the middle: she says in one sentence what is waiting for you today
 * (tap her for the next thing), with four big buttons below and a small row for help and calm.
 */
export function RitiHome({ uid, name, day }: { uid: string | undefined; name: string; day: string }) {
  const today = petDay();
  const hi = greeting(dutchHour());
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
    queryKey: ["challenge-done", uid, challenge?.id, today],
    enabled: !!uid && !!challenge?.id,
    queryFn: async () => {
      // Done once you saved today's task, or wrote anything in your diary today: both answer "Doen".
      const since = new Date(Date.now() - 36 * 3600_000).toISOString();
      const { data } = await supabase
        .from("diary_entries")
        .select("challenge_id, created_at")
        .eq("user_id", uid!)
        .or(`challenge_id.eq.${challenge!.id},created_at.gte.${since}`);
      return (data ?? []).some((e) => e.challenge_id === challenge!.id || challengeDay(new Date(e.created_at)) === challengeDay());
    },
  });
  const unread = useUnreadCounts();
  const { total: news } = useInbox();
  const { stories, read } = useDiscover(uid);
  const verhalen = ofKind(stories, "verhaal");
  const story = storyOfTheDay(verhalen, day);
  const newStories = verhalen.filter((s) => !read.has(s.id)).length;
  const careLeft = CARE_ACTIONS.filter((a) => !careToday.some((c) => c.action === a.id)).length;

  // Today's mood: remembered on this device, and saved privately for the mood calendar.
  const moodKey = uid ? `cerita-gevoel-${uid}-${day}` : null;
  const [mood, setMood] = useState<MoodId | null>(null);
  const [justPicked, setJustPicked] = useState(false);
  useEffect(() => {
    if (!moodKey) return;
    try {
      setMood((moodById(localStorage.getItem(moodKey))?.id as MoodId | undefined) ?? null);
    } catch {
      /* asked again */
    }
  }, [moodKey]);
  function pickMood(id: MoodId) {
    setMood(id);
    setJustPicked(true);
    celebrate("klein", { set: "hartjes" });
    if (uid) void supabase.from("mood_entries").upsert({ user_id: uid, day, mood: id }).then(() => undefined);
    try {
      if (moodKey) localStorage.setItem(moodKey, id);
    } catch {
      /* not remembered */
    }
  }

  const lines = ritiToday({
    moodChosen: !!mood,
    news,
    pet: pet ? { name: pet.name, careLeft } : null,
    groupUnread: unread.groupTotal,
    challengeDone,
    story: story ? { id: story.id, title: story.title, read: read.has(story.id) } : null,
    affirmation: affirmationFor(day, 0),
  });
  const [at, setAt] = useState(0);
  const i = at % lines.length;
  const line = lines[i] ?? lines[lines.length - 1]!;
  const m = moodById(mood);
  const next = () => {
    setJustPicked(false);
    setAt((n) => n + 1);
  };

  const tiles = [
    {
      to: "/diertje",
      emoji: pet ? speciesEmoji(pet.species) : "🥚",
      label: pet?.name ?? "Diertje",
      status: !pet ? "Adopteer er een" : careLeft ? `Nog ${careLeft}× aandacht` : "Superblij 💖",
      badge: !pet || careLeft > 0,
    },
    {
      to: "/community",
      emoji: "👥",
      label: "Groepen",
      status: unread.groupTotal ? `${unread.groupTotal} nieuw` : "Praat mee",
      badge: unread.groupTotal > 0,
    },
    {
      to: "/ontdekken",
      emoji: "📖",
      label: "Verhalen",
      status: newStories ? `${newStories} nieuw` : "Lees of swipe",
      badge: false,
    },
    {
      to: "/dagboek",
      emoji: challengeDone ? "✅" : "📔",
      label: "Dagboek",
      status: challengeDone ? "Opdracht ✓" : "Opdracht wacht",
      badge: !challengeDone,
    },
  ];
  const small = [
    { to: "/ceritabuddy", emoji: "💬", label: "Buddy" },
    { to: "/rust", emoji: "🫧", label: "Rust" },
    { to: "/vragen", emoji: "🎓", label: "Coach" },
    { to: "/hulp", emoji: "🆘", label: "Hulp" },
  ];

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[2rem] bg-secondary px-5 pb-5 pt-4 text-center text-secondary-foreground shadow-soft">
        <h1 className="text-2xl">
          {hi.text}
          {name ? `, ${name}` : ""} <span className="inline-block animate-bounce">{hi.emoji}</span>
        </h1>
        <div className="mx-auto -mb-1 mt-1 w-fit" onClickCapture={next}>
          <Riti size={140} expression={justPicked && m ? ritiFor(m.id) : line.id === "gevoel" ? ritiFor(null) : line.expression} />
        </div>

        <div
          key={`${i}-${justPicked}`}
          className="relative rounded-3xl bg-card p-4 text-left shadow-soft animate-in fade-in zoom-in-95"
        >
          <span aria-hidden className="absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 bg-card" />
          {justPicked && m ? (
            <>
              <p className="font-semibold">
                {m.emoji} {m.reply}
              </p>
              {needsHelpLine(m.id) && (
                <p className="mt-2 rounded-2xl bg-secondary p-3 text-xs text-secondary-foreground">
                  Wil je met iemand praten? Bel of chat gratis met de Kindertelefoon (0800-0432) of 113 (0800-0113).{" "}
                  <Link to="/hulp" className="font-semibold underline">
                    Meer hulp
                  </Link>
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {m.tips.slice(0, 1).map((t) => (
                  <Link key={t.label} to={t.to} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                    {t.emoji} {t.label}
                  </Link>
                ))}
                <button onClick={next} className="rounded-full bg-muted px-4 py-2 text-sm font-semibold">
                  Verder ›
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold leading-snug">{line.text}</p>
              {line.id === "gevoel" ? (
                <>
                  <div className="mt-3 grid grid-cols-5 gap-1">
                    {MOODS.map((x) => (
                      <button
                        key={x.id}
                        onClick={() => pickMood(x.id)}
                        className="flex flex-col items-center rounded-2xl py-1.5 transition-transform hover:bg-muted active:scale-90"
                      >
                        <span className="text-3xl">{x.emoji}</span>
                        <span className="mt-0.5 text-[10px] font-semibold">{x.label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-center text-[11px] text-muted-foreground">Alleen jij ziet je antwoord.</p>
                </>
              ) : (
                line.to && (
                  <div className="mt-3">
                    {line.storyId ? (
                      <Link
                        to="/ontdekken/$articleId"
                        params={{ articleId: line.storyId }}
                        className="inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
                      >
                        {line.button} →
                      </Link>
                    ) : (
                      <Link to={line.to} className="inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
                        {line.button} →
                      </Link>
                    )}
                  </div>
                )
              )}
            </>
          )}
          {lines.length > 1 && !justPicked && (
            <button onClick={next} className="mt-3 flex w-full items-center justify-between text-xs text-muted-foreground">
              <span className="flex gap-1">
                {lines.map((l, n) => (
                  <span key={l.id} className={`size-1.5 rounded-full ${n === i ? "bg-primary" : "bg-muted-foreground/30"}`} />
                ))}
              </span>
              <span>Tik op Riti voor meer ›</span>
            </button>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className={`group relative flex items-center gap-3 rounded-3xl bg-card p-3.5 shadow-soft transition-transform active:scale-95`}
          >
            {t.badge && <span aria-hidden className="absolute right-3 top-3 size-2.5 rounded-full bg-primary ring-2 ring-card" />}
            <span className="shrink-0 text-4xl transition-transform group-hover:scale-110">{t.emoji}</span>
            <span className="min-w-0">
              <span className="block truncate font-semibold">{t.label}</span>
              <span className="block text-xs leading-tight text-muted-foreground">{t.status}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {small.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className={`flex flex-col items-center gap-1 rounded-2xl py-2 text-xs font-semibold transition-transform active:scale-95 ${s.to === "/hulp" ? "bg-primary text-primary-foreground shadow-soft" : "bg-card shadow-soft"}`}
          >
            <span className="text-2xl">{s.emoji}</span>
            {s.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
