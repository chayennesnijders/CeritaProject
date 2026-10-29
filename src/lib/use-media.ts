import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Podcasts, interviews and videos you may see now (the database hides planned and 16+ items). */
export function useMedia() {
  return useQuery({
    queryKey: ["media"],
    queryFn: async () =>
      (
        await supabase
          .from("media_items")
          .select("*")
          .lte("publish_at", new Date().toISOString())
          .order("publish_at", { ascending: false })
      ).data ?? [],
  });
}
