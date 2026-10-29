import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Today's date in the Netherlands (YYYY-MM-DD); the daily challenge switches at 00:00 Dutch time. */
export function challengeDay(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Day of the 365-day cycle (1 January 2026 = day 1, starts over after 365 days); mirrors public.today_challenge(). */
export function challengeCycleDay(day: string): number {
  const days = Math.round(
    (Date.parse(`${day}T00:00:00Z`) - Date.parse("2026-01-01T00:00:00Z")) / 86_400_000,
  );
  return (((days % 365) + 365) % 365) + 1;
}

/** Re-renders when the Dutch date changes, so an open app shows the new challenge right after midnight. */
export function useChallengeDay() {
  const [day, setDay] = useState(challengeDay);
  useEffect(() => {
    const t = setInterval(() => setDay(challengeDay()), 30_000);
    return () => clearInterval(t);
  }, []);
  return day;
}

/** Today's challenge: the admin's pick for today, or else the next one from the 365-day pool. */
export function useTodayChallenge() {
  const day = useChallengeDay();
  return useQuery({
    queryKey: ["challenge", day],
    queryFn: async () => (await supabase.rpc("today_challenge").maybeSingle()).data,
  });
}
