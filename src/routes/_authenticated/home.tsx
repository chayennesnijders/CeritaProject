import { createFileRoute, Link } from "@tanstack/react-router";
import { useThemeOfMonth } from "@/lib/use-theme-month";
import { AutoInstallGuide } from "@/components/InstallGuide";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChallengeDay, useTodayChallenge } from "@/lib/challenges";
import { useMe } from "@/lib/auth";
import { ModerationNotice } from "@/components/ModerationNotice";
import { useMedia } from "@/lib/use-media";
import { formatDuration, isFresh, mediaKind } from "@/lib/media";
import { Riti } from "@/components/Riti";
import { ritiFor } from "@/lib/riti";
import { CARE_ACTIONS, levelFor, petDay, speciesEmoji } from "@/lib/pet";
import { useInbox } from "@/lib/use-inbox";
import { useDiscover } from "@/lib/use-discover";
import { ofKind, readingMinutes, storyOfTheDay } from "@/lib/discover";
import { useArticleImage } from "@/lib/articles";
import {
  MOODS,
  affirmationFor,
  dutchHour,
  greeting,
  moodById,
  needsHelpLine,
  type MoodId,
} from "@/lib/home";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Home — CeritaProject" },
      { name: "description", content: "Jouw dag, opdrachten en updates bij CeritaProject." },
      { property: "og:title", content: "Home — CeritaProject" },
      { property: "og:description", content: "Jouw dag, opdrachten en updates bij CeritaProject." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data: me } = useMe();
  const p = me?.profile;
  const uid = me?.user.id;
  const day = useChallengeDay();
  const hi = greeting(dutchHour());
  const { items: news, total } = useInbox();
  const { data: theme } = useThemeOfMonth();
  const dateLabel = new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <div className="space-y-6 pt-2">
      <div>
        <p className="text-sm text-muted-foreground first-letter:uppercase">{dateLabel}</p>
        <h1 className="text-3xl text-foreground">
          {hi.text}
          {p?.display_name ? `, ${p.display_name}` : ""}{" "}
          <span className="inline-block animate-bounce">{hi.emoji}</span>
        </h1>
        <Affirmation day={day} />
      </div>
      <ModerationNotice />

      {/* Everything new in one line instead of a card per kind; the bell shows the details. */}
      {total > 0 && (
        <Link
          to="/meldingen"
          className="flex items-center gap-3 rounded-3xl bg-primary p-4 text-primary-foreground shadow-soft animate-in fade-in slide-in-from-top-2"
        >
          <span className="text-2xl">🔔</span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">
              {total === 1 ? "Er is iets nieuws voor je" : `${total} nieuwe dingen voor je`}
            </span>
            <span className="block truncate text-xs opacity-85">{news.map((n) => n.emoji).join(" ")}</span>
          </span>
          <span>→</span>
        </Link>
      )}

      <MoodCheckIn uid={uid} day={day} name={p?.display_name ?? ""} />

      <section className="space-y-3">
        <SectionTitle>Vandaag</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <ChallengeCard uid={uid} />
          <PetCard uid={uid} />
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle>Om te lezen en luisteren</SectionTitle>
        <StoryOfTheDay uid={uid} day={day} />
        {theme && (
          <Link to="/thema" className="flex items-center gap-3 rounded-3xl bg-card p-4 shadow-soft">
            <span className="text-3xl">{theme.emoji}</span>
            <span className="flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Thema van de maand
              </span>
              <span className="block font-semibold">{theme.title}: doe mee!</span>
            </span>
            <span className="text-primary">→</span>
          </Link>
        )}
        <NewToListen />
      </section>

      <Link to="/vragen" className="flex items-center gap-3 rounded-3xl border-2 border-primary bg-card p-4 shadow-soft">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-2xl">🎓</span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Praat met een coach</span>
          <span className="block text-xs text-muted-foreground">Je kunt altijd terecht bij een coach met ervaring.</span>
        </span>
        <span className="text-primary">→</span>
      </Link>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/contact" className="rounded-3xl bg-card p-4 text-center shadow-soft">
          <span className="block text-2xl">💌</span>
          <span className="block text-sm font-semibold">Bericht aan beheer</span>
        </Link>
        <Link to="/hulp" className="rounded-3xl bg-card p-4 text-center shadow-soft">
          <span className="block text-2xl">🆘</span>
          <span className="block text-sm font-semibold">Hulp nodig?</span>
        </Link>
      </div>
      <AutoInstallGuide />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{children}</h2>;
}

/** A kind sentence of the day under the greeting; tap for another one. */
function Affirmation({ day }: { day: string }) {
  const [extra, setExtra] = useState(0);
  return (
    <button
      key={extra}
      onClick={() => setExtra((e) => e + 1)}
      className="mt-1 text-left text-sm italic text-muted-foreground animate-in fade-in"
      title="Tik voor een ander zinnetje"
    >
      💫 “{affirmationFor(day, extra)}”
    </button>
  );
}

/** "Hoe voel je je vandaag?" Remembered per member and day on this device only; nobody else sees it. */
/** Riti asks how you feel. */
function MoodCheckIn({ uid, day, name }: { uid: string | undefined; day: string; name: string }) {
  const key = uid ? `cerita-gevoel-${uid}-${day}` : null;
  const [mood, setMood] = useState<MoodId | null>(null);
  useEffect(() => {
    if (!key) return;
    try {
      setMood((moodById(localStorage.getItem(key))?.id as MoodId | undefined) ?? null);
    } catch {
      // Geen opslag: dan vragen we het gewoon opnieuw.
    }
  }, [key]);
  function pick(id: MoodId | null) {
    setMood(id);
    // Also saved privately for your mood calendar (only you can read it).
    if (uid) {
      const q = id
        ? supabase.from("mood_entries").upsert({ user_id: uid, day, mood: id })
        : supabase.from("mood_entries").delete().eq("user_id", uid).eq("day", day);
      void q.then(() => undefined);
    }
    try {
      if (key && id) localStorage.setItem(key, id);
      else if (key) localStorage.removeItem(key);
    } catch {
      // Niet erg als het niet onthouden wordt.
    }
  }
  const m = moodById(mood);

  return (
    <section className="rounded-3xl bg-card p-5 shadow-soft">
      <div className="-ml-2 -mt-2 flex items-center">
        <Riti size={130} expression={ritiFor(mood)} />
        <div
          key={mood ?? "vraag"}
          className="relative flex-1 rounded-2xl bg-muted p-3 text-sm animate-in fade-in zoom-in-95"
        >
          <span
            aria-hidden
            className="absolute -left-1.5 top-1/2 size-3 -translate-y-1/2 rotate-45 bg-muted"
          />
          {!m ? (
            <>
              <p className="font-semibold">
                Hoi{name ? ` ${name}` : ""}! Ik ben Riti 🧸 Hoe voel je je vandaag?
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Alleen jij ziet je antwoord.</p>
            </>
          ) : (
            <p>
              {m.emoji} {m.reply}
            </p>
          )}
        </div>
      </div>
      {!m ? (
        <>
          <div className="mt-3 grid grid-cols-5 gap-1">
            {MOODS.map((x) => (
              <button
                key={x.id}
                onClick={() => pick(x.id)}
                className="flex flex-col items-center rounded-2xl py-2 transition-transform hover:bg-muted active:scale-90"
              >
                <span className="text-3xl">{x.emoji}</span>
                <span className="mt-1 text-[11px] font-semibold">{x.label}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="animate-in fade-in zoom-in-95">
          <div className="mt-3 space-y-2">
            {m.tips.map((t) => (
              <Link
                key={t.label}
                to={t.to}
                className="flex items-center gap-3 rounded-2xl bg-muted p-3 text-sm font-semibold"
              >
                <span className="text-xl">{t.emoji}</span>
                <span className="flex-1">{t.label}</span>
                <span className="text-primary">→</span>
              </Link>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Link
              to="/rust"
              className="rounded-2xl bg-secondary p-3 text-center text-xs font-semibold text-secondary-foreground"
            >
              🫧 Rustmoment met Riti
            </Link>
            <Link
              to="/stemming"
              className="rounded-2xl bg-secondary p-3 text-center text-xs font-semibold text-secondary-foreground"
            >
              📅 Mijn stemmingskalender
            </Link>
          </div>
          {needsHelpLine(m.id) && (
            <p className="mt-3 rounded-2xl bg-secondary p-3 text-xs text-secondary-foreground">
              Wil je met iemand praten? Bel of chat gratis met de Kindertelefoon (0800-0432) of 113
              (0800-0113).{" "}
              <Link to="/hulp" className="font-semibold underline">
                Meer hulp
              </Link>
            </p>
          )}
          <button
            onClick={() => pick(null)}
            className="mt-3 text-xs text-muted-foreground underline"
          >
            Ander gevoel kiezen
          </button>
        </div>
      )}
    </section>
  );
}

/** Today's challenge, with a check mark once you wrote about it in your diary. */
function ChallengeCard({ uid }: { uid: string | undefined }) {
  const { data: challenge } = useTodayChallenge();
  const { data: done = false } = useQuery({
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
  return (
    <Link
      to="/dagboek"
      className="relative flex flex-col overflow-hidden rounded-3xl bg-warm p-4 text-blush shadow-soft"
    >
      <span aria-hidden className="pointer-events-none absolute -right-3 -top-3 text-6xl opacity-15">
        ✨
      </span>
      <p className="text-[10px] uppercase tracking-widest opacity-75">Opdracht</p>
      <p className="mt-1 line-clamp-4 flex-1 font-display text-base leading-snug">
        {challenge?.title ?? "Schrijf vandaag in je dagboek."}
      </p>
      <p className="mt-2 text-xs font-semibold">{done ? "✅ Gedaan!" : "Doe mee →"}</p>
    </Link>
  );
}

/** Your pet: level, and how much care it still needs today. */
function PetCard({ uid }: { uid: string | undefined }) {
  const today = petDay();
  const { data: pet, isLoading } = useQuery({
    queryKey: ["pet", uid],
    enabled: !!uid,
    queryFn: async () =>
      (await supabase.from("pets").select("*").eq("user_id", uid!).maybeSingle()).data,
  });
  const { data: careToday = [] } = useQuery({
    queryKey: ["pet-care-today", uid, today],
    enabled: !!uid,
    queryFn: async () =>
      (await supabase.from("pet_care").select("action").eq("user_id", uid!).eq("care_date", today))
        .data ?? [],
  });
  if (isLoading || !uid) return null;
  if (!pet)
    return (
      <Link to="/diertje" className="flex flex-col items-center justify-center rounded-3xl bg-accent p-4 text-center shadow-soft">
        <span className="animate-bounce text-4xl">🥚</span>
        <span className="mt-1 text-sm font-semibold">Adopteer een diertje!</span>
      </Link>
    );
  const { level, progress } = levelFor(pet.xp);
  const done = new Set(careToday.map((c) => c.action));
  const left = CARE_ACTIONS.filter((a) => !done.has(a.id));
  return (
    <Link to="/diertje" className="flex flex-col rounded-3xl bg-accent p-4 shadow-soft">
      <span className={`text-4xl ${left.length ? "animate-bounce" : ""}`}>{speciesEmoji(pet.species)}</span>
      <p className="mt-1 truncate font-semibold">{pet.name}</p>
      <p className="text-[11px] text-muted-foreground">level {level}</p>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-background/70">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      <p className="mt-1.5 text-[11px]">{left.length === 0 ? "Superblij! 💖" : `Nog: ${left.map((a) => a.emoji).join(" ")}`}</p>
    </Link>
  );
}

/** The same "Verhaal van de dag" as in Ontdekken. */
function StoryOfTheDay({ uid, day }: { uid: string | undefined; day: string }) {
  const { stories, read } = useDiscover(uid);
  const story = storyOfTheDay(ofKind(stories, "verhaal"), day);
  const { data: src } = useArticleImage(story?.image_url);
  if (!story) return null;
  return (
    <Link
      to="/ontdekken/$articleId"
      params={{ articleId: story.id }}
      className="flex items-center gap-4 rounded-3xl bg-card p-4 shadow-soft"
    >
      {src ? (
        <img src={src} alt="" className="size-20 shrink-0 rounded-2xl object-cover" />
      ) : (
        <span className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-muted text-3xl">
          {story.emoji}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
          🌟 Verhaal van de dag
        </p>
        <p className="mt-0.5 line-clamp-2 font-semibold leading-snug">{story.title}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          ⏱️ {readingMinutes(story.body)} min{read.has(story.id) ? " · ✓ Gelezen" : ""}
        </p>
      </div>
    </Link>
  );
}

/** The newest podcast or interview, for a week after it came out. */
function NewToListen() {
  const { data: items = [] } = useMedia();
  const item = items[0];
  if (!item || !isFresh(item)) return null;
  const k = mediaKind(item.kind);
  return (
    <Link
      to="/luisteren/$mediaId"
      params={{ mediaId: item.id }}
      className="flex items-center gap-4 rounded-3xl bg-secondary p-4 text-secondary-foreground shadow-soft"
    >
      <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-2xl text-primary-foreground">
        ▶
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-wide">
          ✨ Nieuw · {k.emoji} {k.label}
        </span>
        <span className="block font-semibold leading-snug">{item.title}</span>
        {item.duration_seconds ? (
          <span className="text-xs opacity-80">{formatDuration(item.duration_seconds)}</span>
        ) : null}
      </span>
    </Link>
  );
}
