import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    // Remember the page (e.g. /testlijst from a link) so login brings people right back to it.
    if (!data.user) throw redirect({ to: "/auth", search: { terug: location.href } as never });
  },
  component: AppShell,
});
