BEGIN;

CREATE TABLE IF NOT EXISTS public.buddy_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT true,
  model text NOT NULL DEFAULT 'gpt-5-mini',
  daily_limit int NOT NULL DEFAULT 40 CHECK (daily_limit BETWEEN 0 AND 1000),
  context_messages int NOT NULL DEFAULT 16 CHECK (context_messages BETWEEN 2 AND 60),
  max_reply_tokens int NOT NULL DEFAULT 700 CHECK (max_reply_tokens BETWEEN 100 AND 4000),
  extra_instructions text NOT NULL DEFAULT '' CHECK (length(extra_instructions) <= 8000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
INSERT INTO public.buddy_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.buddy_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins lezen buddy-instellingen" ON public.buddy_settings;
CREATE POLICY "admins lezen buddy-instellingen" ON public.buddy_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins wijzigen buddy-instellingen" ON public.buddy_settings;
CREATE POLICY "admins wijzigen buddy-instellingen" ON public.buddy_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
REVOKE ALL ON public.buddy_settings FROM anon, authenticated;
GRANT SELECT, UPDATE ON public.buddy_settings TO authenticated;

CREATE TABLE IF NOT EXISTS public.buddy_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.buddy_prefs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "eigen buddy-voorkeuren" ON public.buddy_prefs;
CREATE POLICY "eigen buddy-voorkeuren" ON public.buddy_prefs
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
REVOKE ALL ON public.buddy_prefs FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buddy_prefs TO authenticated;

CREATE TABLE IF NOT EXISTS public.buddy_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Nieuw gesprek' CHECK (length(title) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS buddy_conversations_user ON public.buddy_conversations (user_id, updated_at DESC);
ALTER TABLE public.buddy_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "eigen buddy-gesprekken lezen" ON public.buddy_conversations;
CREATE POLICY "eigen buddy-gesprekken lezen" ON public.buddy_conversations
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "eigen buddy-gesprekken hernoemen" ON public.buddy_conversations;
CREATE POLICY "eigen buddy-gesprekken hernoemen" ON public.buddy_conversations
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "eigen buddy-gesprekken verwijderen" ON public.buddy_conversations;
CREATE POLICY "eigen buddy-gesprekken verwijderen" ON public.buddy_conversations
  FOR DELETE TO authenticated USING (user_id = auth.uid());
REVOKE INSERT, UPDATE ON public.buddy_conversations FROM anon, authenticated;
GRANT SELECT, DELETE ON public.buddy_conversations TO authenticated;
GRANT UPDATE (title) ON public.buddy_conversations TO authenticated;

CREATE TABLE IF NOT EXISTS public.buddy_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.buddy_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 12000),
  safety boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS buddy_messages_conversation ON public.buddy_messages (conversation_id, created_at);
ALTER TABLE public.buddy_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "eigen buddy-berichten lezen" ON public.buddy_messages;
CREATE POLICY "eigen buddy-berichten lezen" ON public.buddy_messages
  FOR SELECT TO authenticated USING (user_id = auth.uid());
REVOKE INSERT, UPDATE, DELETE ON public.buddy_messages FROM anon, authenticated;
GRANT SELECT ON public.buddy_messages TO authenticated;

CREATE TABLE IF NOT EXISTS public.buddy_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  messages int NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
ALTER TABLE public.buddy_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.buddy_usage FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.buddy_take_turn(_user uuid)
RETURNS int LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.buddy_usage (user_id, day, messages)
  VALUES (_user, (now() AT TIME ZONE 'Europe/Amsterdam')::date, 1)
  ON CONFLICT (user_id, day) DO UPDATE SET messages = buddy_usage.messages + 1
  RETURNING messages;
$$;
REVOKE ALL ON FUNCTION public.buddy_take_turn(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.buddy_cleanup(_user uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.buddy_conversations WHERE user_id = _user AND updated_at < now() - interval '90 days';
$$;
REVOKE ALL ON FUNCTION public.buddy_cleanup(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.buddy_status()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'enabled', s.enabled,
    'daily_limit', s.daily_limit,
    'used_today', COALESCE((SELECT u.messages FROM public.buddy_usage u
                            WHERE u.user_id = auth.uid()
                              AND u.day = (now() AT TIME ZONE 'Europe/Amsterdam')::date), 0)
  )
  FROM public.buddy_settings s WHERE s.id = 1;
$$;
REVOKE ALL ON FUNCTION public.buddy_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buddy_status() TO authenticated;

CREATE OR REPLACE FUNCTION public.buddy_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Alleen voor beheerders'; END IF;
  RETURN jsonb_build_object(
    'messages_today', COALESCE((SELECT sum(messages) FROM public.buddy_usage WHERE day = (now() AT TIME ZONE 'Europe/Amsterdam')::date), 0),
    'people_today', (SELECT count(*) FROM public.buddy_usage WHERE day = (now() AT TIME ZONE 'Europe/Amsterdam')::date),
    'people_7_days', (SELECT count(DISTINCT user_id) FROM public.buddy_usage WHERE day > (now() AT TIME ZONE 'Europe/Amsterdam')::date - 7),
    'messages_7_days', COALESCE((SELECT sum(messages) FROM public.buddy_usage WHERE day > (now() AT TIME ZONE 'Europe/Amsterdam')::date - 7), 0)
  );
END $$;
REVOKE ALL ON FUNCTION public.buddy_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buddy_stats() TO authenticated;

COMMIT;
