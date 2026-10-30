import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Your own returns, shared by all orders in "Mijn bestellingen". */
export function useMyReturns(uid: string | undefined) {
  return useQuery({
    queryKey: ["my-returns", uid],
    enabled: !!uid,
    queryFn: async () =>
      (await supabase.from("shop_returns").select("*").eq("user_id", uid!)).data ?? [],
  });
}
