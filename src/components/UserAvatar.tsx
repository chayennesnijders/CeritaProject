import { useQuery } from "@tanstack/react-query";
import { Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSignedImage } from "@/lib/articles";

/** Alle beheerders (admin/eigenaar), zodat leden weten bij wie ze terechtkunnen. */
export function useAdminIds() {
  return useQuery({
    queryKey: ["admin-ids"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.rpc("admin_ids");
      return new Set<string>((data ?? []) as string[]);
    },
  });
}

/** Profielfoto van een lid; valt terug op de eerste letter. Beheerders krijgen een schildje. */
export function UserAvatar({ path, name, size = "size-10", userId }: { path?: string | null | undefined; name: string; size?: string; userId?: string | null | undefined }) {
  const { data: url } = useSignedImage("avatars", path);
  const { data: admins } = useAdminIds();
  const isAdmin = !!userId && !!admins?.has(userId);
  const pic = url ? (
    <img src={url} alt={name} className={`${size} shrink-0 rounded-full object-cover`} />
  ) : (
    <div className={`${size} flex shrink-0 items-center justify-center rounded-full bg-secondary font-display text-secondary-foreground`}>
      {name.slice(0, 1)}
    </div>
  );
  return (
    <div className="relative shrink-0" title={isAdmin ? `${name} is beheerder` : undefined}>
      {pic}
      {isAdmin && (
        <span aria-label="Beheerder" className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full border-2 border-card bg-ink text-secondary">
          <Shield className="size-3" fill="currentColor" />
        </span>
      )}
    </div>
  );
}
