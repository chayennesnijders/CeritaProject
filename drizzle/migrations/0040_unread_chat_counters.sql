-- Ongelezen-aantallen voor privé-chats en groepenschats
ALTER TABLE public.conversation_prefs ADD COLUMN IF NOT EXISTS last_read_at timestamptz;

CREATE TABLE public.group_reads (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, group_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_reads TO authenticated;
GRANT ALL ON public.group_reads TO service_role;
ALTER TABLE public.group_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY group_reads_self ON public.group_reads FOR ALL
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Ongelezen berichten per privégesprek van de aanroeper
CREATE OR REPLACE FUNCTION public.my_dm_unread()
RETURNS TABLE (conversation_id uuid, unread integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id,
    (SELECT count(*)::int FROM public.direct_messages m
       WHERE m.conversation_id = c.id
         AND m.sender_id <> auth.uid()
         AND m.created_at > COALESCE(p.last_read_at, c.created_at)) AS unread
  FROM public.conversations c
  LEFT JOIN public.conversation_prefs p
    ON p.conversation_id = c.id AND p.user_id = auth.uid()
  WHERE (c.user_a = auth.uid() OR c.user_b = auth.uid())
    AND c.status = 'accepted'
$$;

-- Ongelezen berichten per groep waar de aanroeper lid van is
CREATE OR REPLACE FUNCTION public.my_group_unread()
RETURNS TABLE (group_id uuid, unread integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT gm.group_id,
    (SELECT count(*)::int FROM public.posts po
       WHERE po.group_id = gm.group_id
         AND po.is_hidden = false
         AND po.author_id <> auth.uid()
         AND po.created_at > COALESCE(gr.last_read_at, gm.joined_at)) AS unread
  FROM public.group_members gm
  LEFT JOIN public.group_reads gr
    ON gr.group_id = gm.group_id AND gr.user_id = auth.uid()
  WHERE gm.user_id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.my_dm_unread() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_group_unread() TO authenticated;
