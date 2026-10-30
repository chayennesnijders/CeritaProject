import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { challengeDay } from "@/lib/challenges";
import { monthOf } from "@/lib/goals";

/** This month's theme, or null when admins have not set one. */
export function useThemeOfMonth() {
  const month = monthOf(challengeDay());
  return useQuery({
    queryKey: ["theme-month", month],
    queryFn: async () =>
      (await supabase.from("themes").select("*").eq("month", month).maybeSingle()).data,
  });
}
