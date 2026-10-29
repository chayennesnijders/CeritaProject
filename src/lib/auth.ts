import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      ]);
      return {
        user: u.user,
        profile,
        isAdmin: !!roles?.some((r) => r.role === "admin"),
        isOwner: !!roles?.some((r) => r.role === "owner"),
      };
    },
  });
}

/** 12–15 = junior, 16–25 = senior, 26–27 = adult (elk een eigen community), 28+ = app zonder community, <12 niet toegestaan */
export function ageGroupFor(birthdate: Date, today = new Date()): "junior" | "senior" | "adult" | "no_community" | "too_young" {
  let age = today.getFullYear() - birthdate.getFullYear();
  const m = today.getMonth() - birthdate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) age--;
  if (age < 12) return "too_young";
  if (age <= 15) return "junior";
  if (age <= 25) return "senior";
  if (age <= 27) return "adult";
  return "no_community";
}

export const bandLabel = (g: string) => (g === "junior" ? "12–15" : g === "senior" ? "16–25" : "26–27");
