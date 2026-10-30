import { createFileRoute, redirect } from "@tanstack/react-router";

// "Vrienden zoeken" is now part of Buddy zoeken (with search by username); old links still work.
export const Route = createFileRoute("/_authenticated/vrienden")({
  beforeLoad: () => {
    throw redirect({ to: "/buddy", replace: true });
  },
});
