import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // Pages you just saw show straight away instead of loading again: data stays
  // fresh for 30 seconds. Chats, the inbox and unread counts always refresh.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000 } },
  });
  for (const live of ["chat", "group", "inbox", "unread", "chat-game", "poll", "reactions", "group-challenge", "report-inbox", "inbox-extra"]) {
    queryClient.setQueryDefaults([live], { staleTime: 0 });
  }

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Start loading a page's code as soon as a finger touches its link.
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  });

  return router;
};
