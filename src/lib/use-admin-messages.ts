import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Your own messages to the admins, with their answers (contact page and the home button). */
export function useMyAdminMessages(uid: string | undefined) {
  return useQuery({
    queryKey: ["my-admin-messages", uid],
    enabled: !!uid,
    queryFn: async () =>
      (
        await supabase
          .from("admin_messages")
          .select("id, topic, body, status, reply, reply_seen, replied_at, created_at")
          .eq("user_id", uid!)
          .order("created_at", { ascending: false })
      ).data ?? [],
  });
}
