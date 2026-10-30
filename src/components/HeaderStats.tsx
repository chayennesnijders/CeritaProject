import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell, PawPrint } from "lucide-react";
import { useInbox } from "@/lib/use-inbox";
import { supabase } from "@/integrations/supabase/client";
import { challengeDay } from "@/lib/challenges";
import { levelFor } from "@/lib/pet";
import { shiftDay, streakDays } from "@/lib/streak";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
        className="flex items-center gap-0.5 rounded-full bg-secondary/20 mr-0.5 px-2 py-1 text-sm font-bold text-ink-foreground"
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
      className="relative rounded-full p-1.5 text-ink-foreground hover:bg-secondary hover:text-secondary-foreground"
      activeProps={{ className: "bg-secondary !text-secondary-foreground" }}
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
      className="relative rounded-full p-1.5 text-ink-foreground hover:bg-secondary hover:text-secondary-foreground"
      activeProps={{ className: "bg-secondary !text-secondary-foreground" }}
    >
      <Bell className="size-5" />
      {total > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
          {total > 9 ? "9+" : total}
        </span>
      )}
    </Link>
  );
}
