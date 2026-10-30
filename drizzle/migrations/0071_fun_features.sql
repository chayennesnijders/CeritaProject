-- Fun and wellbeing features: emoji reactions, polls and Riti stickers in chats, a private mood calendar,
-- an anonymous compliment wall, a weekly group challenge and badges.

-- ===== Emoji reactions: one per member per message, like iMessage tapbacks =====
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (emoji IN ('❤️', '😂', '😮', '😢', '👍', '🙏')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((post_id IS NULL) <> (message_id IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS message_reactions_post_user ON public.message_reactions (post_id, user_id) WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS message_reactions_dm_user ON public.message_reactions (message_id, user_id) WHERE message_id IS NOT NULL;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_reactions TO authenticated;
GRANT ALL ON public.message_reactions TO service_role;

-- Can the current user read (and react to) this private message?
CREATE OR REPLACE FUNCTION public.can_see_dm(_message uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.direct_messages m JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.id = _message AND auth.uid() IN (c.user_a, c.user_b) AND c.status = 'accepted')
$$;
REVOKE ALL ON FUNCTION public.can_see_dm(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_see_dm(uuid) TO authenticated;

DROP POLICY IF EXISTS "see reactions" ON public.message_reactions;
CREATE POLICY "see reactions" ON public.message_reactions FOR SELECT TO authenticated USING (
  (post_id IS NOT NULL AND public.can_access_group(public.post_group(post_id)))
  OR (message_id IS NOT NULL AND public.can_see_dm(message_id))
);
DROP POLICY IF EXISTS "react" ON public.message_reactions;
CREATE POLICY "react" ON public.message_reactions FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND NOT public.is_timed_out(auth.uid()) AND (
    (post_id IS NOT NULL AND public.is_member(public.post_group(post_id)) AND public.can_access_group(public.post_group(post_id)))
    OR (message_id IS NOT NULL AND public.can_see_dm(message_id)))
);
DROP POLICY IF EXISTS "change own reaction" ON public.message_reactions;
CREATE POLICY "change own reaction" ON public.message_reactions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "remove own reaction" ON public.message_reactions;
CREATE POLICY "remove own reaction" ON public.message_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ===== Polls in group chats =====
CREATE TABLE IF NOT EXISTS public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question text NOT NULL CHECK (char_length(question) BETWEEN 3 AND 140),
  options text[] NOT NULL CHECK (cardinality(options) BETWEEN 2 AND 6),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.poll_votes (
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  option smallint NOT NULL CHECK (option >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, user_id)
);
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.polls TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poll_votes TO authenticated;
GRANT ALL ON public.polls, public.poll_votes TO service_role;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS poll_id uuid REFERENCES public.polls(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "see polls" ON public.polls;
CREATE POLICY "see polls" ON public.polls FOR SELECT TO authenticated USING (public.can_access_group(group_id));
DROP POLICY IF EXISTS "see votes" ON public.poll_votes;
CREATE POLICY "see votes" ON public.poll_votes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.polls p WHERE p.id = poll_id AND public.can_access_group(p.group_id)));
DROP POLICY IF EXISTS "vote" ON public.poll_votes;
CREATE POLICY "vote" ON public.poll_votes FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND NOT public.is_timed_out(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.polls p WHERE p.id = poll_id AND option < cardinality(p.options)
      AND public.is_member(p.group_id) AND public.can_access_group(p.group_id))
);
DROP POLICY IF EXISTS "change vote" ON public.poll_votes;
CREATE POLICY "change vote" ON public.poll_votes FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.polls p WHERE p.id = poll_id AND option < cardinality(p.options)));
DROP POLICY IF EXISTS "remove vote" ON public.poll_votes;
CREATE POLICY "remove vote" ON public.poll_votes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Makes a poll and posts it in the group in one go.
CREATE OR REPLACE FUNCTION public.create_poll(_group uuid, _question text, _options text[])
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  q text := btrim(coalesce(_question, ''));
  opts text[];
  pid uuid;
BEGIN
  IF me IS NULL OR NOT public.is_member(_group) OR NOT public.can_access_group(_group) OR public.is_timed_out(me) THEN
    RAISE EXCEPTION 'Je kunt in deze groep geen peiling maken.';
  END IF;
  SELECT array_agg(left(btrim(o), 60)) INTO opts FROM unnest(_options) o WHERE btrim(o) <> '';
  IF char_length(q) < 3 OR char_length(q) > 140 OR coalesce(cardinality(opts), 0) NOT BETWEEN 2 AND 6 THEN
    RAISE EXCEPTION 'Een peiling heeft een vraag en 2 tot 6 antwoorden.';
  END IF;
  INSERT INTO public.polls (group_id, created_by, question, options) VALUES (_group, me, q, opts) RETURNING id INTO pid;
  INSERT INTO public.posts (group_id, author_id, body, poll_id) VALUES (_group, me, '📊 ' || q, pid);
  RETURN pid;
END $$;
REVOKE ALL ON FUNCTION public.create_poll(uuid, text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_poll(uuid, text, text[]) TO authenticated;

-- ===== Riti stickers in chats =====
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS sticker text;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS sticker text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_sticker_check') THEN
    ALTER TABLE public.posts ADD CONSTRAINT posts_sticker_check CHECK (sticker IS NULL OR sticker ~ '^[a-z]{2,20}$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'direct_messages_sticker_check') THEN
    ALTER TABLE public.direct_messages ADD CONSTRAINT direct_messages_sticker_check CHECK (sticker IS NULL OR sticker ~ '^[a-z]{2,20}$');
  END IF;
END $$;

-- ===== Mood calendar: private, only you see your own days =====
CREATE TABLE IF NOT EXISTS public.mood_entries (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day date NOT NULL,
  mood text NOT NULL CHECK (mood IN ('super', 'goed', 'gaat-wel', 'verdrietig', 'gestrest')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);
ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mood_entries TO authenticated;
GRANT ALL ON public.mood_entries TO service_role;
DROP POLICY IF EXISTS "own moods" ON public.mood_entries;
CREATE POLICY "own moods" ON public.mood_entries FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND day BETWEEN current_date - 1 AND current_date + 1);

-- ===== Compliment wall: kind compliments from a fixed list, the receiver never sees who sent it =====
CREATE TABLE IF NOT EXISTS public.compliments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  compliment smallint NOT NULL CHECK (compliment BETWEEN 1 AND 24),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_id <> to_id)
);
CREATE INDEX IF NOT EXISTS compliments_to_idx ON public.compliments (to_id, created_at DESC);
ALTER TABLE public.compliments ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.compliments TO authenticated;
GRANT ALL ON public.compliments TO service_role;
-- Only admins read the table itself; members get their own compliments without the sender through my_compliments().
DROP POLICY IF EXISTS "admins see compliments" ON public.compliments;
CREATE POLICY "admins see compliments" ON public.compliments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.send_compliment(_to uuid, _compliment integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid();
BEGIN
  IF me IS NULL OR public.is_timed_out(me) OR NOT public.can_message(_to) THEN
    RAISE EXCEPTION 'Je kunt deze persoon geen compliment sturen.';
  END IF;
  IF _compliment NOT BETWEEN 1 AND 24 THEN
    RAISE EXCEPTION 'Kies een compliment uit de lijst.';
  END IF;
  IF (SELECT count(*) FROM public.compliments WHERE from_id = me AND created_at > now() - interval '1 day') >= 10 THEN
    RAISE EXCEPTION 'Je hebt vandaag al 10 complimenten gestuurd. Morgen weer!';
  END IF;
  IF EXISTS (SELECT 1 FROM public.compliments WHERE from_id = me AND to_id = _to AND created_at > now() - interval '1 day') THEN
    RAISE EXCEPTION 'Je hebt deze persoon vandaag al een compliment gestuurd.';
  END IF;
  INSERT INTO public.compliments (from_id, to_id, compliment) VALUES (me, _to, _compliment::smallint);
END $$;

CREATE OR REPLACE FUNCTION public.my_compliments()
RETURNS TABLE (id uuid, compliment smallint, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.compliment, c.created_at FROM public.compliments c
  WHERE c.to_id = auth.uid() ORDER BY c.created_at DESC LIMIT 200
$$;
REVOKE ALL ON FUNCTION public.send_compliment(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_compliments() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_compliment(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_compliments() TO authenticated;

-- ===== Weekly group challenge: members tick off a shared goal; at 15 ticks everyone who helped gets 30 XP =====
CREATE TABLE IF NOT EXISTS public.group_challenge_checkins (
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT current_date,
  PRIMARY KEY (group_id, user_id, day)
);
CREATE TABLE IF NOT EXISTS public.group_challenge_claims (
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week date NOT NULL,
  PRIMARY KEY (group_id, user_id, week)
);
ALTER TABLE public.group_challenge_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_challenge_claims ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.group_challenge_checkins, public.group_challenge_claims TO authenticated;
GRANT ALL ON public.group_challenge_checkins, public.group_challenge_claims TO service_role;
DROP POLICY IF EXISTS "see checkins" ON public.group_challenge_checkins;
CREATE POLICY "see checkins" ON public.group_challenge_checkins FOR SELECT TO authenticated USING (public.can_access_group(group_id));
DROP POLICY IF EXISTS "see own claims" ON public.group_challenge_claims;
CREATE POLICY "see own claims" ON public.group_challenge_claims FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.checkin_group_challenge(_group uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_member(_group) OR NOT public.can_access_group(_group) OR public.is_timed_out(auth.uid()) THEN
    RAISE EXCEPTION 'Je kunt in deze groep niet meedoen.';
  END IF;
  INSERT INTO public.group_challenge_checkins (group_id, user_id) VALUES (_group, auth.uid()) ON CONFLICT DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.claim_group_challenge(_group uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  wk date := date_trunc('week', current_date)::date;
BEGIN
  IF NOT public.is_member(_group) OR NOT public.can_access_group(_group) THEN RETURN 0; END IF;
  IF (SELECT count(*) FROM public.group_challenge_checkins WHERE group_id = _group AND day >= wk) < 15 THEN RETURN 0; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.group_challenge_checkins WHERE group_id = _group AND user_id = auth.uid() AND day >= wk) THEN RETURN 0; END IF;
  INSERT INTO public.group_challenge_claims (group_id, user_id, week) VALUES (_group, auth.uid(), wk) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN 0; END IF;
  UPDATE public.pets SET xp = xp + 30 WHERE user_id = auth.uid();
  RETURN 30;
END $$;
REVOKE ALL ON FUNCTION public.checkin_group_challenge(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_group_challenge(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.checkin_group_challenge(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_group_challenge(uuid) TO authenticated;

-- ===== Badges: counts about yourself only; the app decides which badges they earn =====
CREATE OR REPLACE FUNCTION public.my_badge_stats()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'stories', (SELECT count(*) FROM public.story_submissions WHERE user_id = auth.uid()),
    'diary', (SELECT count(*) FROM public.diary_entries WHERE user_id = auth.uid()),
    'moods', (SELECT count(*) FROM public.mood_entries WHERE user_id = auth.uid()),
    'games_won', (SELECT count(*) FROM public.chat_games WHERE winner = auth.uid()),
    'compliments_sent', (SELECT count(*) FROM public.compliments WHERE from_id = auth.uid()),
    'compliments_received', (SELECT count(*) FROM public.compliments WHERE to_id = auth.uid()),
    'challenges', (SELECT count(*) FROM public.group_challenge_claims WHERE user_id = auth.uid()),
    'groups_made', (SELECT count(*) FROM public.groups WHERE created_by = auth.uid()),
    'pet_xp', coalesce((SELECT xp FROM public.pets WHERE user_id = auth.uid()), 0)
  )
$$;
REVOKE ALL ON FUNCTION public.my_badge_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_badge_stats() TO authenticated;

-- Live: reactions, votes and challenge ticks show up straight away.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['message_reactions', 'poll_votes', 'group_challenge_checkins'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
