CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_a < user_b),
  UNIQUE (user_a, user_b)
);
CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX direct_messages_conv_idx ON public.direct_messages (conversation_id, created_at);
CREATE TABLE public.blocks (
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);
GRANT SELECT, INSERT ON public.conversations TO authenticated;
GRANT SELECT, INSERT ON public.direct_messages TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.blocks TO authenticated;
GRANT ALL ON public.conversations, public.direct_messages, public.blocks TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.reports ADD COLUMN message_id uuid REFERENCES public.direct_messages(id) ON DELETE SET NULL;

-- Mag ik (nu) met deze persoon chatten? Zelfde leeftijdsgroep, beiden 12-27, niet geblokkeerd, ontvanger staat berichten toe.
CREATE OR REPLACE FUNCTION public.can_message(_other uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _other <> auth.uid()
    AND public.can_use_community()
    AND EXISTS (SELECT 1 FROM public.profiles me, public.profiles o
      WHERE me.id = auth.uid() AND o.id = _other
        AND me.birthdate IS NOT NULL AND o.birthdate IS NOT NULL
        AND date_part('year', age(o.birthdate)) BETWEEN 12 AND 27
        AND me.age_group = o.age_group
        AND o.allow_messages)
    AND NOT EXISTS (SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = _other)
         OR (b.blocker_id = _other AND b.blocked_id = auth.uid()))
$$;

CREATE OR REPLACE FUNCTION public.conv_other(_conv uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN user_a = auth.uid() THEN user_b WHEN user_b = auth.uid() THEN user_a END
  FROM public.conversations WHERE id = _conv
$$;

-- Gesprekken alleen zichtbaar zolang je 12-27 bent (28+: gesprekken vallen weg).
CREATE POLICY "see own conversations" ON public.conversations FOR SELECT TO authenticated
  USING ((auth.uid() IN (user_a, user_b)) AND public.can_use_community());
CREATE POLICY "start conversation" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_a AND public.can_message(user_b)) OR (auth.uid() = user_b AND public.can_message(user_a)));

CREATE POLICY "read messages" ON public.direct_messages FOR SELECT TO authenticated
  USING (public.conv_other(conversation_id) IS NOT NULL AND public.can_use_community());
CREATE POLICY "send messages" ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.can_message(public.conv_other(conversation_id)));

CREATE POLICY "own blocks" ON public.blocks FOR SELECT TO authenticated USING (blocker_id = auth.uid());
CREATE POLICY "block someone" ON public.blocks FOR INSERT TO authenticated WITH CHECK (blocker_id = auth.uid() AND blocked_id <> auth.uid());
CREATE POLICY "unblock" ON public.blocks FOR DELETE TO authenticated USING (blocker_id = auth.uid());

CREATE OR REPLACE FUNCTION public.bump_conversation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id; RETURN NEW; END $$;
CREATE TRIGGER bump_conversation AFTER INSERT ON public.direct_messages FOR EACH ROW EXECUTE FUNCTION public.bump_conversation();

ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;