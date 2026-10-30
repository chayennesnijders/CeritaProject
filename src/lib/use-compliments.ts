import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { complimentsSeenKey, newCompliments } from "@/lib/compliments";

/** Your compliment wall (shared by the home page card and the wall itself). */
export function useMyCompliments(uid: string | undefined) {
  return useQuery({
    queryKey: ["my-compliments", uid],
    enabled: !!uid,
    queryFn: async () => (await supabase.rpc("my_compliments")).data ?? [],
  });
}

function readSeen(uid: string | undefined) {
  if (!uid) return null;
  try {
    return localStorage.getItem(complimentsSeenKey(uid));
  } catch {
    return null;
  }
}

/** How many compliments are new since you last opened your wall on this device. */
export function useNewCompliments(uid: string | undefined) {
  const { data: wall = [] } = useMyCompliments(uid);
  const [seenAt, setSeenAt] = useState<string | null>(null);
  useEffect(() => setSeenAt(readSeen(uid)), [uid]);
  return newCompliments(wall, seenAt).length;
}

/**
 * Call when the wall is open: everything up to now counts as seen. Returns when you looked before
 * (null = never, undefined = not known yet).
 */
export function useMarkComplimentsSeen(uid: string | undefined, active: boolean) {
  const [before, setBefore] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!uid || !active) return;
    // Read before writing, and keep the first value: in development React runs this effect twice.
    const prev = readSeen(uid);
    setBefore((b) => (b === undefined ? prev : b));
    try {
      localStorage.setItem(complimentsSeenKey(uid), new Date().toISOString());
    } catch {
      /* not remembered: then they show as new again next time */
    }
  }, [uid, active]);
  return before;
}
