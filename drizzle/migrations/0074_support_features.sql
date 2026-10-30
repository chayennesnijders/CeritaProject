-- Support and comfort: a private safety plan, anonymous questions, letters to your future self,
-- online meetups, finding a buddy and quiet hours for push messages.

-- ===== Safety plan: private, only the member sees it =====
CREATE TABLE IF NOT EXISTS public.safety_plans (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (pg_column_size(plan) <= 20000),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.safety_plans ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.safety_plans TO authenticated;
GRANT ALL ON public.safety_plans TO service_role;
DROP POLICY IF EXISTS "own safety plan" ON public.safety_plans;
CREATE POLICY "own safety plan" ON public.safety_plans FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ===== Anonymous questions: admins answer; answered ones can go on the wall of the asker's age band =====
CREATE TABLE IF NOT EXISTS public.anon_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  age_group public.age_group NOT NULL,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 5 AND 600),
  status text NOT NULL DEFAULT 'nieuw' CHECK (status IN ('nieuw', 'beantwoord', 'afgewezen')),
  answer text CHECK (char_length(answer) <= 3000),
  published boolean NOT NULL DEFAULT false,
  answered_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  answered_at timestamptz,
  answer_seen boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS anon_questions_wall_idx ON public.anon_questions (age_group, answered_at DESC) WHERE published;
ALTER TABLE public.anon_questions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.anon_questions TO authenticated;
GRANT UPDATE (answer_seen) ON public.anon_questions TO authenticated;
GRANT ALL ON public.anon_questions TO service_role;
-- The table itself: only your own questions (and admins). Others read the wall through question_wall().
DROP POLICY IF EXISTS "own questions" ON public.anon_questions;
CREATE POLICY "own questions" ON public.anon_questions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "mark answer seen" ON public.anon_questions;
CREATE POLICY "mark answer seen" ON public.anon_questions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.ask_question(_body text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  band public.age_group;
  qid uuid;
BEGIN
  SELECT age_group INTO band FROM public.profiles WHERE id = me AND birthdate IS NOT NULL;
  IF me IS NULL OR band IS NULL OR public.is_timed_out(me) THEN
    RAISE EXCEPTION 'Je kunt nu geen vraag stellen.';
  END IF;
  IF char_length(btrim(coalesce(_body, ''))) NOT BETWEEN 5 AND 600 THEN
    RAISE EXCEPTION 'Je vraag moet tussen 5 en 600 tekens zijn.';
  END IF;
  IF (SELECT count(*) FROM public.anon_questions WHERE user_id = me AND created_at > now() - interval '1 day') >= 3 THEN
    RAISE EXCEPTION 'Je hebt vandaag al 3 vragen gesteld. Morgen weer!';
  END IF;
  INSERT INTO public.anon_questions (user_id, age_group, body) VALUES (me, band, btrim(_body)) RETURNING id INTO qid;
  RETURN qid;
END $$;

-- Admins: answer (and maybe publish), or decline.
CREATE OR REPLACE FUNCTION public.answer_question(_question uuid, _answer text, _publish boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a text := nullif(btrim(coalesce(_answer, '')), '');
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Alleen beheerders.'; END IF;
  UPDATE public.anon_questions SET
    status = CASE WHEN a IS NULL THEN 'afgewezen' ELSE 'beantwoord' END,
    answer = a, published = a IS NOT NULL AND coalesce(_publish, false),
    answered_by = auth.uid(), answered_at = now(), answer_seen = false
  WHERE id = _question;
END $$;

-- The wall: answered questions of your own age band, without who asked.
CREATE OR REPLACE FUNCTION public.question_wall()
RETURNS TABLE (id uuid, body text, answer text, answered_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.id, q.body, q.answer, q.answered_at FROM public.anon_questions q
  WHERE q.published AND q.status = 'beantwoord' AND q.age_group = public.my_age_group()
  ORDER BY q.answered_at DESC LIMIT 100
$$;
REVOKE ALL ON FUNCTION public.ask_question(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.answer_question(uuid, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.question_wall() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ask_question(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.answer_question(uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.question_wall() TO authenticated;

-- Worrying words in a question also become a care signal for the admins.
ALTER TABLE public.safety_alerts DROP CONSTRAINT IF EXISTS safety_alerts_source_check;
ALTER TABLE public.safety_alerts ADD CONSTRAINT safety_alerts_source_check CHECK (source IN ('post', 'comment', 'dm', 'vraag'));
CREATE OR REPLACE FUNCTION public.flag_care() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.needs_care(NEW.body) THEN
    INSERT INTO public.safety_alerts (source, ref_id, author_id, excerpt)
    VALUES (TG_ARGV[0], NEW.id,
      coalesce(to_jsonb(NEW)->>'author_id', to_jsonb(NEW)->>'sender_id', to_jsonb(NEW)->>'user_id')::uuid,
      left(NEW.body, 300));
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.flag_care() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS flag_care ON public.anon_questions;
CREATE TRIGGER flag_care AFTER INSERT ON public.anon_questions FOR EACH ROW EXECUTE FUNCTION public.flag_care('vraag');

-- ===== Letters to your future self: sealed until the chosen day =====
CREATE TABLE IF NOT EXISTS public.future_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 5000),
  open_at date NOT NULL,
  notified boolean NOT NULL DEFAULT false,
  opened_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.future_letters ENABLE ROW LEVEL SECURITY;
GRANT DELETE ON public.future_letters TO authenticated;
GRANT ALL ON public.future_letters TO service_role;
-- No direct reading: my_letters() only gives the text once the day has come.
DROP POLICY IF EXISTS "remove own letter" ON public.future_letters;
CREATE POLICY "remove own letter" ON public.future_letters FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.write_letter(_body text, _months integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE lid uuid;
BEGIN
  IF auth.uid() IS NULL OR _months NOT IN (1, 3, 6, 12) THEN RAISE EXCEPTION 'Kies 1, 3, 6 of 12 maanden.'; END IF;
  IF char_length(btrim(coalesce(_body, ''))) NOT BETWEEN 1 AND 5000 THEN RAISE EXCEPTION 'Je brief mag maximaal 5000 tekens zijn.'; END IF;
  IF (SELECT count(*) FROM public.future_letters WHERE user_id = auth.uid() AND opened_at IS NULL) >= 10 THEN
    RAISE EXCEPTION 'Je hebt al 10 brieven die nog dicht zijn.';
  END IF;
  INSERT INTO public.future_letters (user_id, body, open_at)
  VALUES (auth.uid(), btrim(_body), (current_date + make_interval(months => _months))::date) RETURNING id INTO lid;
  RETURN lid;
END $$;

CREATE OR REPLACE FUNCTION public.my_letters()
RETURNS TABLE (id uuid, body text, open_at date, opened_at timestamptz, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.id, CASE WHEN l.open_at <= current_date THEN l.body END, l.open_at, l.opened_at, l.created_at
  FROM public.future_letters l WHERE l.user_id = auth.uid() ORDER BY l.open_at
$$;

CREATE OR REPLACE FUNCTION public.open_letter(_letter uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.future_letters SET opened_at = coalesce(opened_at, now())
  WHERE id = _letter AND user_id = auth.uid() AND open_at <= current_date
$$;
REVOKE ALL ON FUNCTION public.write_letter(text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_letters() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.open_letter(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.write_letter(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_letters() TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_letter(uuid) TO authenticated;

-- ===== Online meetups per age band =====
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 80),
  description text CHECK (char_length(description) <= 1000),
  starts_at timestamptz NOT NULL,
  minutes integer NOT NULL DEFAULT 60 CHECK (minutes BETWEEN 10 AND 240),
  link text CHECK (link IS NULL OR (link ~ '^https://\S+$' AND char_length(link) <= 300)),
  age_group public.age_group NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.event_rsvps (
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reminded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.event_rsvps TO authenticated;
GRANT ALL ON public.events, public.event_rsvps TO service_role;
DROP POLICY IF EXISTS "see events of my age" ON public.events;
CREATE POLICY "see events of my age" ON public.events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR (public.can_use_community() AND age_group = public.my_age_group()));
DROP POLICY IF EXISTS "admins manage events" ON public.events;
CREATE POLICY "admins manage events" ON public.events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- How many go is visible to everyone who sees the event; who goes only to admins and yourself.
DROP POLICY IF EXISTS "see own rsvp" ON public.event_rsvps;
CREATE POLICY "see own rsvp" ON public.event_rsvps FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "rsvp" ON public.event_rsvps;
CREATE POLICY "rsvp" ON public.event_rsvps FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id
    AND e.starts_at > now() - interval '1 hour' AND public.can_use_community() AND e.age_group = public.my_age_group()));
DROP POLICY IF EXISTS "cancel rsvp" ON public.event_rsvps;
CREATE POLICY "cancel rsvp" ON public.event_rsvps FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.event_counts()
RETURNS TABLE (event_id uuid, going integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.event_id, count(*)::int FROM public.event_rsvps r JOIN public.events e ON e.id = r.event_id
  WHERE public.has_role(auth.uid(), 'admin') OR (public.can_use_community() AND e.age_group = public.my_age_group())
  GROUP BY r.event_id
$$;
REVOKE ALL ON FUNCTION public.event_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.event_counts() TO authenticated;

-- ===== Buddy: interests and "I'd like a buddy" =====
CREATE TABLE IF NOT EXISTS public.buddy_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  interests text[] NOT NULL DEFAULT '{}' CHECK (cardinality(interests) <= 8),
  looking boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.buddy_profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buddy_profiles TO authenticated;
GRANT ALL ON public.buddy_profiles TO service_role;
DROP POLICY IF EXISTS "own buddy profile" ON public.buddy_profiles;
CREATE POLICY "own buddy profile" ON public.buddy_profiles FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Members of your own age band who also look for a buddy, most shared interests first.
CREATE OR REPLACE FUNCTION public.buddy_suggestions()
RETURNS TABLE (user_id uuid, display_name text, username text, avatar_url text, shared text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.display_name, p.username, p.avatar_url,
    ARRAY(SELECT unnest(b.interests) INTERSECT SELECT unnest(mine.interests))
  FROM public.buddy_profiles mine
  JOIN public.buddy_profiles b ON b.user_id <> mine.user_id AND b.looking
  JOIN public.profiles p ON p.id = b.user_id
  WHERE mine.user_id = auth.uid() AND mine.looking AND public.can_message(p.id)
    AND NOT EXISTS (SELECT 1 FROM public.conversations c
      WHERE (c.user_a = auth.uid() AND c.user_b = p.id) OR (c.user_b = auth.uid() AND c.user_a = p.id))
  ORDER BY cardinality(ARRAY(SELECT unnest(b.interests) INTERSECT SELECT unnest(mine.interests))) DESC, b.updated_at DESC
  LIMIT 20
$$;
REVOKE ALL ON FUNCTION public.buddy_suggestions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buddy_suggestions() TO authenticated;

-- ===== Quiet hours: no pushes between these hours (Dutch time); null = always allowed =====
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS quiet_start smallint CHECK (quiet_start BETWEEN 0 AND 23);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS quiet_end smallint CHECK (quiet_end BETWEEN 0 AND 23);

-- ===== Reminders: letters that may be opened and meetups that start soon (every 15 minutes) =====
INSERT INTO public.cron_tokens(name) VALUES ('member_reminders') ON CONFLICT (name) DO NOTHING;
CREATE OR REPLACE FUNCTION public.schedule_member_reminders(site_url text)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  RETURN cron.schedule('member-reminders', '*/15 * * * *', format($job$
    SELECT net.http_post(
      url := %L,
      headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(SELECT token FROM public.cron_tokens WHERE name='member_reminders')),
      body := '{}'::jsonb);
  $job$, rtrim(site_url, '/') || '/api/public/member-reminders'));
END
$fn$;
REVOKE ALL ON FUNCTION public.schedule_member_reminders(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_member_reminders(text) TO service_role;
DO $$ BEGIN
  IF to_regnamespace('cron') IS NOT NULL THEN PERFORM public.schedule_member_reminders('https://app.ceritaproject.nl'); END IF;
END $$;

-- ===== Nieuws for admins: also anonymous questions =====
CREATE OR REPLACE FUNCTION public.admin_news(_days integer DEFAULT 30)
RETURNS TABLE (kind text, ref_id uuid, title text, detail text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM (
    SELECT 'aanmelding'::text, p.id, p.display_name,
           coalesce('@' || p.username, '') AS detail, p.created_at
    FROM public.profiles p
    UNION ALL
    SELECT 'bestelling', o.id, coalesce(sp.name, o.product),
           o.ship_name || CASE WHEN o.amount_cents > 0 THEN ' · €' || replace(to_char(o.amount_cents / 100.0, 'FM999990.00'), '.', ',') ELSE ' · gratis' END,
           o.created_at
    FROM public.shop_orders o
    LEFT JOIN public.shop_products sp ON sp.id = o.product_id
    WHERE public.is_owner(auth.uid())
    UNION ALL
    SELECT 'verhaal', s.id, s.title,
           CASE WHEN s.may_publish THEN 'Mag gepubliceerd worden' ELSE 'Geen toestemming om te publiceren' END,
           s.created_at
    FROM public.story_submissions s
    UNION ALL
    SELECT 'bericht', m.id, left(m.body, 120), coalesce(p.display_name, 'Lid'), m.created_at
    FROM public.admin_messages m LEFT JOIN public.profiles p ON p.id = m.user_id
    UNION ALL
    SELECT 'zorg', a.id, a.excerpt, coalesce(p.display_name, 'Lid') || CASE a.source WHEN 'dm' THEN ' · privégesprek' WHEN 'comment' THEN ' · reactie in groep' WHEN 'vraag' THEN ' · anonieme vraag' ELSE ' · bericht in groep' END, a.created_at
    FROM public.safety_alerts a LEFT JOIN public.profiles p ON p.id = a.author_id
    UNION ALL
    SELECT 'retour', r.id, o.product, coalesce(p.display_name, 'Lid') || coalesce(' · ' || nullif(left(r.reason, 80), ''), ''), r.created_at
    FROM public.shop_returns r JOIN public.shop_orders o ON o.id = r.order_id LEFT JOIN public.profiles p ON p.id = r.user_id
    WHERE public.is_owner(auth.uid())
    UNION ALL
    SELECT 'contact', c.id, left(c.body, 120), c.name || ' · ' || c.sender_type, c.created_at
    FROM public.public_messages c
    UNION ALL
    SELECT 'groep', g.id, g.emoji || ' ' || g.name, coalesce(p.display_name, 'Lid') || ' · ' || g.age_group::text, g.created_at
    FROM public.groups g JOIN public.profiles p ON p.id = g.created_by
    UNION ALL
    SELECT 'vraag', q.id, left(q.body, 120), CASE q.status WHEN 'nieuw' THEN 'Nog niet beantwoord' WHEN 'beantwoord' THEN 'Beantwoord' ELSE 'Niet geplaatst' END, q.created_at
    FROM public.anon_questions q
    UNION ALL
    SELECT 'melding', r.id, left(r.reason, 120),
           CASE WHEN r.status = 'open' THEN 'Nog niet afgehandeld' ELSE 'Afgehandeld' END, r.created_at
    FROM public.reports r
  ) news(kind, ref_id, title, detail, created_at)
  WHERE public.has_role(auth.uid(), 'admin')
    AND news.created_at > now() - make_interval(days => least(greatest(_days, 1), 365))
  ORDER BY news.created_at DESC
  LIMIT 200
$$;
REVOKE ALL ON FUNCTION public.admin_news(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_news(integer) TO authenticated;
