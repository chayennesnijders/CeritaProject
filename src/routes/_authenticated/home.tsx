import { createFileRoute, Link } from "@tanstack/react-router";
import { useActsAsParent } from "@/lib/parent-view";
import { TesterCard } from "@/components/TesterCard";
import { StayInTouchCard } from "@/components/StayInTouchCard";
import { shareInvite } from "@/components/InviteFriendCard";
import { HomeQuickGrid } from "@/components/HomeQuickGrid";
import { FounderStory } from "@/components/FounderStory";
import { ParentHome } from "@/components/ParentHome";
import { ThemeDayCard } from "@/components/ThemeDayCard";
import { parentDay } from "@/lib/parent";
import { celebrate } from "@/lib/celebrate";
import { useThemeOfMonth } from "@/lib/use-theme-month";
import { AutoInstallGuide } from "@/components/InstallGuide";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useChallengeDay } from "@/lib/challenges";
import { useMe } from "@/lib/auth";
import { ModerationNotice } from "@/components/ModerationNotice";
import { useMedia } from "@/lib/use-media";
import { isFresh } from "@/lib/media";
import { Riti } from "@/components/Riti";
import { ritiFor } from "@/lib/riti";
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
  const asParent = useActsAsParent();
  const uid = me?.user.id;
  const day = useChallengeDay();
  const hi = greeting(dutchHour());
  const { items: news, total } = useInbox();
  const { data: theme } = useThemeOfMonth();
  const { data: media = [] } = useMedia();
  const freshListen = !!media[0] && isFresh(media[0]);
  const chip =
    "shrink-0 rounded-full bg-card px-3.5 py-2 text-sm font-semibold shadow-soft transition-transform active:scale-95";
  const dateLabel = new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  // Parents and carers have their own home (no groups, chats or young people's content).
  if (asParent && uid) return <ParentHome uid={uid} day={day} name={p?.display_name ?? ""} />;

  return (
    <div className="space-y-5 pt-2">
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
      <ThemeDayCard day={day} audience="jongeren" />
      <TesterCard uid={uid} />
      {p?.also_parent && (
        <Link to="/ouderhoek" className="flex items-center gap-3 rounded-3xl bg-secondary p-4 text-secondary-foreground shadow-soft">
          <span className="text-2xl">👶</span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Jouw ouderhoek</span>
            <span className="block truncate text-xs opacity-80">{parentDay(day).child}</span>
          </span>
          <span>→</span>
        </Link>
      )}

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

      <HomeQuickGrid uid={uid} />
      <MoodCheckIn uid={uid} day={day} name={p?.display_name ?? ""} />
      <StoryOfTheDay uid={uid} day={day} />
      <StayInTouchCard />

      {/* The rest, small: everything stays one tap away without filling the screen. */}
      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Ook leuk</h2>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {theme && (
            <Link to="/thema" className={chip}>
              {theme.emoji} {theme.title}
            </Link>
          )}
          <Link to="/luisteren" className={chip}>
            🎧 Luisteren{freshListen ? " ✨" : ""}
          </Link>
          <Link to="/stemming" className={chip}>
            📅 Mijn stemmingen
          </Link>
          <Link to="/complimenten" className={chip}>
            💐 Complimenten
          </Link>
          <button onClick={() => void shareInvite()} className={chip}>
            👋 Nodig iemand uit
          </button>
          <Link to="/contact" className={chip}>
            💌 Bericht aan beheer
          </Link>
        </div>
      </section>
      {me?.isOwner && <FounderStory day={day} />}
      <AutoInstallGuide />
    </div>
  );
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
    if (id) celebrate("klein", { set: "hartjes" });
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

