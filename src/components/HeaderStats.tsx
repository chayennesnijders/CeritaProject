import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell, GraduationCap, PawPrint, Shield, ShoppingBag } from "lucide-react";
import { useInbox } from "@/lib/use-inbox";
import { supabase } from "@/integrations/supabase/client";
import { challengeDay } from "@/lib/challenges";
import { levelFor } from "@/lib/pet";
import { shiftDay, streakDays } from "@/lib/streak";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** One look for every round button in the pink top bar, so the row reads as one calm group. */
export const headerButton =
  "relative grid size-9 shrink-0 place-items-center rounded-full bg-ink-foreground/10 text-ink-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground";
const headerActive = { className: "!bg-secondary !text-secondary-foreground" };

/** Small count on a header button. */
function HeaderBadge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-ink">
      {n > 9 ? "9+" : n}
    </span>
  );
}

/** 🔥 Days in a row you did something: cared for your pet or wrote in your diary. */
export function StreakChip({ uid }: { uid: string | undefined }) {
  const today = challengeDay();
  const { data: streak = 0 } = useQuery({
    queryKey: ["streak", uid, today],
    enabled: !!uid,
    queryFn: async () => {
      const since = shiftDay(today, -90);
      const [care, diary] = await Promise.all([
        supabase.from("pet_care").select("care_date").eq("user_id", uid!).gte("care_date", since),
        supabase
          .from("diary_entries")
          .select("created_at")
          .eq("user_id", uid!)
          .gte("created_at", since),
      ]);
      const days = new Set<string>([
        ...(care.data ?? []).map((c) => c.care_date),
        ...(diary.data ?? []).map((d) => challengeDay(new Date(d.created_at))),
      ]);
      return streakDays(days, today);
    },
  });
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`${streak} dagen op rij`}
        className="flex h-9 shrink-0 items-center gap-0.5 rounded-full bg-ink-foreground/10 px-2.5 text-sm font-bold text-ink-foreground"
      >
        <span className={streak > 0 ? "motion-safe:animate-pulse" : "grayscale"}>🔥</span>
        {streak}
      </PopoverTrigger>
      <PopoverContent className="w-64 rounded-3xl text-sm">
        <p className="font-semibold">
          {streak === 0
            ? "Start je reeks! 🔥"
            : `${streak} ${streak === 1 ? "dag" : "dagen"} op rij! 🔥`}
        </p>
        <p className="mt-1 text-muted-foreground">
          Elke dag dat je je diertje verzorgt of in je dagboek schrijft, telt mee. Een dag
          overslaan? Dan begin je gewoon opnieuw, dat is helemaal oké.
        </p>
      </PopoverContent>
    </Popover>
  );
}

/** Paw button to your pet, with its level. */
export function PetLink({ uid }: { uid: string | undefined }) {
  const { data: pet } = useQuery({
    queryKey: ["pet", uid],
    enabled: !!uid,
    queryFn: async () =>
      (await supabase.from("pets").select("*").eq("user_id", uid!).maybeSingle()).data,
  });
  return (
    <Link
      to="/diertje"
      data-tour="diertje"
      aria-label={pet ? `Mijn diertje, level ${levelFor(pet.xp).level}` : "Mijn diertje"}
      className={headerButton}
      activeProps={headerActive}
    >
      <PawPrint className="size-5" />
    </Link>
  );
}

/** 🔔 Bell with everything that wants your attention (Meldingen page). */
export function InboxBell() {
  const { total } = useInbox();
  return (
    <Link
      to="/meldingen"
      aria-label={total ? `Meldingen: ${total} nieuw` : "Meldingen"}
      className={headerButton}
      activeProps={headerActive}
    >
      <Bell className="size-5" />
      <HeaderBadge n={total} />
    </Link>
  );
}

/** Shop bag to the CeritaShop. */
export function ShopLink() {
  return (
    <Link
      to="/shop"
      data-tour="shop"
      aria-label="CeritaShop"
      className={headerButton}
      activeProps={headerActive}
    >
      <ShoppingBag className="size-5" />
    </Link>
  );
}

/** For coaches only: how many anonymous questions wait (null when you are not an active coach). */
function useCoachOpen(uid: string | undefined) {
  const { data } = useQuery({
    queryKey: ["coach-open", uid],
    enabled: !!uid,
    refetchInterval: 120_000,
    queryFn: async () => {
      const { data: me } = await supabase
        .from("coaches")
        .select("active")
        .eq("user_id", uid!)
        .maybeSingle();
      if (!me?.active) return null;
      const { data } = await supabase.rpc("coach_questions");
      return (data ?? []).filter((q) => q.status === "nieuw").length;
    },
  });
  return data ?? null;
}

/**
 * Admins and coaches get one extra button instead of two: it goes straight to Beheer or Coach,
 * or opens a little menu with both when you are both.
 */
export function WorkMenu({
  uid,
  isAdmin,
  adminCount,
}: {
  uid: string | undefined;
  isAdmin: boolean;
  adminCount: number;
}) {
  const coachOpen = useCoachOpen(uid);
  const isCoach = coachOpen != null;
  if (!isAdmin && !isCoach) return null;
  const Icon = isAdmin ? Shield : GraduationCap;
  const total = (isAdmin ? adminCount : 0) + (coachOpen ?? 0);
  if (!isAdmin || !isCoach) {
    return (
      <Link
        to={isAdmin ? "/beheer" : "/coach"}
        aria-label={isAdmin ? "Beheer" : coachOpen ? `Coach: ${coachOpen} vragen` : "Coach"}
        className={headerButton}
        activeProps={headerActive}
      >
        <Icon className="size-5" />
        <HeaderBadge n={total} />
      </Link>
    );
  }
  const item = "flex items-center gap-3 rounded-2xl px-3 py-2.5 font-semibold hover:bg-muted";
  const count = (n: number) =>
    n > 0 && (
      <span className="ml-auto rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground">
        {n > 9 ? "9+" : n}
      </span>
    );
  return (
    <Popover>
      <PopoverTrigger aria-label="Beheer en coach" className={headerButton}>
        <Icon className="size-5" />
        <HeaderBadge n={total} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 rounded-3xl p-2 text-sm">
        <Link to="/beheer" className={item}>
          <Shield className="size-5" /> Beheer {count(adminCount)}
        </Link>
        <Link to="/coach" className={item}>
          <GraduationCap className="size-5" /> Coach {count(coachOpen ?? 0)}
        </Link>
      </PopoverContent>
    </Popover>
  );
}
