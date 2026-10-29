CREATE TABLE public.conversation_prefs (
  user_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  muted boolean not null default false,
  archived boolean not null default false,
  primary key (user_id, conversation_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_prefs TO authenticated;
GRANT ALL ON public.conversation_prefs TO service_role;
ALTER TABLE public.conversation_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own conversation prefs" ON public.conversation_prefs FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.group_prefs (
  user_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  muted boolean not null default false,
  archived boolean not null default false,
  primary key (user_id, group_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_prefs TO authenticated;
GRANT ALL ON public.group_prefs TO service_role;
ALTER TABLE public.group_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own group prefs" ON public.group_prefs FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());