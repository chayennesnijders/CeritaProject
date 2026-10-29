import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const reportsQueryOptions = (uid: string | undefined, closed = false) => queryOptions({
  queryKey: ["report-inbox", uid, closed],
  enabled: !!uid,
  refetchInterval: 15000,
  queryFn: async () => {
    const rows = [];
    for (let from = 0; ; from += 500) {
      let query = supabase.from("reports").select("*, reporter:profiles!reports_reporter_id_fkey(display_name), post:posts(body,author_id), message:direct_messages(body,sender_id)").order("created_at", { ascending: false }).order("id");
      query = closed ? query.neq("status", "open") : query.eq("status", "open");
      const { data, error } = await query.range(from, from + 499);
      if (error) throw error;
      rows.push(...data);
      if (data.length < 500) break;
    }
    return rows;
  },
});