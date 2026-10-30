import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { notifyChatRequest } from "@/lib/push.functions";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";

/** The coaches, with a button to chat with one (a chat request the coach accepts, like any other chat). */
export function TalkToCoach() {
  const { data: me } = useMe();
  const uid = me?.user.id;
  const nav = useNavigate();
  const notify = useServerFn(notifyChatRequest);
  const { data } = useQuery({
    queryKey: ["coach-list", uid],
    enabled: !!uid,
    queryFn: async () => {
      const [c, conv] = await Promise.all([
        supabase
          .from("coaches")
          .select("user_id, title, bio, profile:profiles(avatar_url)")
          .eq("active", true)
          .order("created_at"),
        supabase
          .from("conversations")
          .select("id, user_a, user_b, status")
          .or(`user_a.eq.${uid},user_b.eq.${uid}`),
      ]);
      const convWith = new Map(
        (conv.data ?? []).map((x) => [x.user_a === uid ? x.user_b : x.user_a, x]),
      );
      return (c.data ?? [])
        .filter((x) => x.user_id !== uid)
        .map((x) => ({ ...x, conv: convWith.get(x.user_id) }));
    },
  });

  async function chat(coachId: string) {
    if (!uid) return;
    const existing = data?.find((c) => c.user_id === coachId)?.conv;
    if (existing?.status === "accepted")
      return nav({ to: "/berichten/$id", params: { id: existing.id } });
    if (existing) return toast("Je verzoek is verstuurd. De coach reageert zo snel mogelijk.");
    const [a, b] = [uid, coachId].sort();
    const { data: created, error } = await supabase
      .from("conversations")
      .insert({ user_a: a!, user_b: b!, requested_by: uid })
      .select("id")
      .single();
    if (error) {
      toast.error("Dat lukte niet. Probeer het later opnieuw.");
      return;
    }
    notify({ data: { convId: created.id } }).catch(() => {});
    toast.success("Verstuurd! Zodra de coach accepteert, kunnen jullie chatten. 💛");
  }

  if (!data?.length) return null;
  return (
    <section className="space-y-2 rounded-3xl bg-card p-4 shadow-soft">
      <p className="flex items-center gap-2 font-semibold">
        <GraduationCap className="size-5 text-primary" /> Praat met een coach
      </p>
      <p className="text-xs text-muted-foreground">
        Onze coaches hebben ervaring en luisteren naar je, zonder oordeel. Je herkent ze aan het
        🎓-symbool.
      </p>
      {data.map((c) => (
        <div key={c.user_id} className="flex items-center gap-3 rounded-2xl bg-muted p-3">
          <UserAvatar
            path={(c.profile as { avatar_url?: string | null } | null)?.avatar_url}
            name={c.title}
            userId={c.user_id}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{c.title}</p>
            {c.bio && <p className="line-clamp-2 text-xs text-muted-foreground">{c.bio}</p>}
          </div>
          <Button size="sm" className="shrink-0 rounded-full" onClick={() => chat(c.user_id)}>
            {c.conv?.status === "accepted" ? "Chat" : c.conv ? "Verstuurd" : "Chat 💬"}
          </Button>
        </div>
      ))}
    </section>
  );
}
