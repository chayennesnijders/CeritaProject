import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TesterRow = {
  role: string;
  checks: Record<string, boolean>;
  notes: Record<string, string>;
  updated_at: string;
};

/** The signed-in tester's own checklist row (null: not started yet; installed false: update 56 missing). */
export function useMyTesterRow(uid: string | undefined) {
  return useQuery({
    queryKey: ["tester-progress", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tester_progress")
        .select("role, checks, notes, updated_at")
        .eq("user_id", uid!)
        .maybeSingle();
      return { installed: !error, row: (data as TesterRow | null) ?? null };
    },
  });
}
