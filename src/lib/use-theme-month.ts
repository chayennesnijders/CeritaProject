import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { challengeDay } from "@/lib/challenges";

/** First day of the month (YYYY-MM-01) for a day. */
export const monthOf = (day: string) => `${day.slice(0, 7)}-01`;

/** This month's theme, or null when admins have not set one. */
export function useThemeOfMonth() {
  const month = monthOf(challengeDay());
  return useQuery({
    queryKey: ["theme-month", month],
    queryFn: async () =>
      (await supabase.from("themes").select("*").eq("month", month).maybeSingle()).data,
  });
}
