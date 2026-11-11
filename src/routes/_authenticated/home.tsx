import { createFileRoute, Link } from "@tanstack/react-router";
import { useActsAsParent } from "@/lib/parent-view";
import { TesterCard } from "@/components/TesterCard";
import { StayInTouchCard } from "@/components/StayInTouchCard";
import { shareInvite } from "@/components/InviteFriendCard";
import { RitiHome } from "@/components/RitiHome";
import { FounderStory } from "@/components/FounderStory";
import { ParentHome } from "@/components/ParentHome";
import { TeacherHome } from "@/components/TeacherHome";
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

  // Teachers only see their school's lessons.
  if (p?.is_teacher && uid) return <TeacherHome uid={uid} name={p.display_name ?? ""} />;
  // Parents and carers have their own home (no groups, chats or young people's content).
  if (asParent && uid) return <ParentHome uid={uid} day={day} name={p?.display_name ?? ""} />;

  return (
    <div className="space-y-4 pt-2">
      <ModerationNotice />
      <TesterCard uid={uid} />
      <RitiHome uid={uid} name={p?.display_name ?? ""} day={day} />
      <ThemeDayCard day={day} audience="jongeren" />
      <StayInTouchCard />
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

      {/* The rest, small: everything stays one tap away without filling the screen. */}
      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Meer om te doen</h2>
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
