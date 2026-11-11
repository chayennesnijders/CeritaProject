import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useNowPlaying } from "@/lib/now-playing";
import { NowPlayingBar } from "@/components/NowPlayingBar";
import { WeeklyRulesPopup } from "@/components/WeeklyRulesPopup";
import { useEffect } from "react";
import { CallProvider } from "@/components/CallProvider";
import { BirthdayPopup } from "@/components/BirthdayPopup";
import { AppLock } from "@/components/AppLock";
import { WelcomeTour } from "@/components/WelcomeTour";
import { BirthdateGate } from "@/components/BirthdateGate";
import { InboxBell, PetLink, ShopLink, StreakChip, WorkMenu } from "@/components/HeaderStats";
import { CareHelpDialog } from "@/components/CareHelpDialog";
import { toast } from "sonner";
import { listenForeground } from "@/lib/push-client";
import { Home, Users, Compass, MessageCircle, User, CalendarHeart, Wind, BookOpen } from "lucide-react";
import { parentMayOpen } from "@/lib/parent";
import { teacherMayOpen } from "@/lib/teacher";
import { useMe, ageGroupFor } from "@/lib/auth";
import { useUnreadCounts, badgeLabel } from "@/lib/unread";
import { useAdminNews } from "@/lib/use-admin-news";
import { setParentView, useActsAsParent, useParentView } from "@/lib/parent-view";
import { supabase } from "@/integrations/supabase/client";

const tabs = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/community", label: "Community", icon: Users },
  { to: "/ontdekken", label: "Ontdekken", icon: Compass },
  { to: "/berichten", label: "Berichten", icon: MessageCircle },
  { to: "/profiel", label: "Profiel", icon: User },
] as const;

/** Parents and carers get their own, smaller menu: no groups, stories or messages. */
const parentTabs = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/stemming", label: "Stemming", icon: CalendarHeart },
  { to: "/rust", label: "Rust", icon: Wind },
  { to: "/profiel", label: "Profiel", icon: User },
] as const;

/** Teachers only have their lessons and their profile. */
const teacherTabs = [
  { to: "/home", label: "Lessen", icon: BookOpen },
  { to: "/profiel", label: "Profiel", icon: User },
] as const;

export function AppShell() {
  const { data: me } = useMe();
  const unread = useUnreadCounts();
  const news = useAdminNews(me?.isAdmin ? me.user.id : undefined);
  const navigate = useNavigate();
  // Room for the music bar above the menu while something plays.
  const playing = !!useNowPlaying();
  // Each page fades in softly (opacity only, so fixed bars inside a page stay put).
  const page = useRouterState({ select: (st) => st.location.pathname });
  // Meldingen die binnenkomen terwijl de app open is, tonen we als pop-up bovenin.
  useEffect(() => {
    let stop: () => void = () => {};
    listenForeground((p) => {
      if (p.link && window.location.pathname === p.link) return;
      if (p.title.includes("Inkomend")) return; // het belscherm verschijnt al vanzelf // je zit al in dit gesprek
      toast(p.title, { description: p.body, action: p.link ? { label: "Openen", onClick: () => navigate({ to: p.link! }) } : undefined });
    }).then((fn) => { stop = fn; }).catch(() => {});
    return () => stop();
  }, [navigate]);
  // Leden vanaf 28 zien de community niet meer; de rest van de app blijft beschikbaar.
  const band = me?.profile?.birthdate ? ageGroupFor(new Date(me.profile.birthdate)) : null;
  // 28+ has no community; coaches of any age keep Berichten for their chats with members.
  const isTeacher = !!me?.profile?.is_teacher;
  const isParent = useActsAsParent() && !isTeacher;
  // Teachers and parents share the quiet header: no inbox, shop or welcome tour.
  const isGrownUp = isParent || isTeacher;
  const parentView = useParentView();
  const visibleTabs = isTeacher ? teacherTabs : isParent ? parentTabs : tabs.filter((t) => {
    if (band !== "no_community") return true;
    if (t.to === "/community") return false;
    if (t.to === "/berichten") return !!me?.isCoach;
    return true;
  });
  return (
    <AppLock>
    <BirthdateGate>
    <CallProvider>
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      <BirthdayPopup />
      <CareHelpDialog />
      {!isGrownUp && <WelcomeTour />}
      {!isGrownUp && <WeeklyRulesPopup uid={me?.user.id} />}
      <header className="sticky top-0 z-20 flex print:hidden items-center justify-between gap-2 rounded-b-3xl bg-ink py-2 pl-3 pr-4 text-ink-foreground">
        <Link to="/home" aria-label="Cerita Project" className="flex min-w-0 items-center gap-2">
          <img src="/cerita-beer.png" alt="" className="size-11 shrink-0 rounded-full bg-[#faf3ea] object-cover" />
          {/* On a phone the bear logo alone; the name only where it fits without being cut off. */}
          <span className="hidden min-w-0 leading-tight min-[440px]:block">
            <span className="block truncate font-display text-base">CeritaProject</span>
            <span className="block truncate text-[10px] opacity-70">Jouw verhaal mag er zijn</span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
          {/* Parents also have a diary and a pet (their own, private), so they keep the streak and the paw. */}
          {!isTeacher && <StreakChip uid={me?.user.id} />}
          {!isGrownUp && <InboxBell />}
          {!isTeacher && <PetLink uid={me?.user.id} />}
          {!isGrownUp && <ShopLink />}
          <WorkMenu uid={me?.user.id} isAdmin={!!me?.isStaff} adminCount={unread.reports + (me?.isAdmin ? news.unread : 0)} />
        </div>
      </header>
      {parentView && (
        <div className="sticky top-[3.75rem] z-20 mx-3 mt-2 flex items-center gap-2 rounded-2xl bg-[#fff4d6] px-3 py-2 text-xs text-[#5c4300] shadow-soft print:hidden">
          <span className="flex-1">
            👪 <b>Je bekijkt de app als ouder.</b> Alles werkt echt, met jouw eigen account.
          </span>
          <button
            onClick={() => {
              setParentView(false);
              void navigate({ to: "/beheer" });
            }}
            className="shrink-0 rounded-full bg-[#5c4300] px-3 py-1 font-semibold text-white"
          >
            Stoppen
          </button>
        </div>
      )}
      <NowPlayingBar />
      {/* Room under every page for the menu bar plus the iPhone home bar, so the last block never hides behind it. */}
      <main
        className={`flex-1 px-5 ${playing ? "pb-[calc(18rem+env(safe-area-inset-bottom,0px))]" : "pb-[calc(9rem+env(safe-area-inset-bottom,0px))]"}`}
      >
        <div key={page} className="animate-in fade-in duration-300 motion-reduce:animate-none">
          {(isTeacher && !teacherMayOpen(page)) || (isParent && !parentMayOpen(page)) ? <ForYoungPeople /> : <Outlet />}
        </div>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 print:hidden mx-auto max-w-md px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <div className="flex justify-around rounded-3xl border-2 border-secondary bg-ink px-2 py-2 text-ink-foreground shadow-soft">
          {visibleTabs.map(({ to, label, icon: Icon }) => {
            const n = to === "/berichten" ? unread.dmTotal + unread.requests : to === "/community" ? unread.groupTotal : 0;
            return (
              <Link
                key={to}
                data-tour={to.slice(1)}
                to={to}
                className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] opacity-70"
                activeProps={{ className: "bg-secondary text-secondary-foreground opacity-100" }}
              >
                <span className="relative">
                  <Icon className="size-5" />
                  <TabBadge n={n} />
                </span>
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
    </CallProvider>
    </BirthdateGate>
    </AppLock>
  );
}

/** What a parent sees on a page that is only for young people. */
function ForYoungPeople() {
  return (
    <div className="mt-6 space-y-3 rounded-3xl bg-card p-6 text-center shadow-soft">
      <p className="text-3xl">🔒</p>
      <h1 className="text-xl">Dit deel is voor jongeren</h1>
      <p className="text-sm text-muted-foreground">
        Groepen, chats en verhalen zijn alleen voor jongeren, zodat het voor hen een veilige plek blijft. Op je
        startscherm vind je alles wat voor jou klaarstaat.
      </p>
      <Link to="/home" className="inline-block rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
        Naar mijn startscherm
      </Link>
    </div>
  );
}

/** Roze plantje met een aantal, bijvoorbeeld ongelezen berichten. */
export function TabBadge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-ink bg-accent px-1 text-[10px] font-bold leading-none text-accent-foreground">
      {badgeLabel(n)}
    </span>
  );
}

export function SoonCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-4 rounded-3xl border border-dashed border-primary/30 bg-card p-6 text-center">
      <span className="inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">Binnenkort</span>
      <h2 className="mt-3 text-2xl text-primary">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
