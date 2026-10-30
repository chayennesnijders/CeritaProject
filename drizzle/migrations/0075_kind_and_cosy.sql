-- Kinder and cosier: mean words are hidden in chats and groups (admins hear about repeat
-- offenders), personal goals with daily ticks, a gratitude jar, and a theme of the month with entries.

-- ===== Mean words: replaced by ✱✱✱ before a message is saved (same list as src/lib/kindness.ts) =====
CREATE OR REPLACE FUNCTION public.censor(_text text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(coalesce(_text, ''), $re$\y(kut|kutwijf|kutjoch|klootzak|lul|eikel|hoer|hoeren|hoerenjong|slet|sletten|mongool|mongolen|debiel|tyfus|tyfuslijer|tering|teringlijer|kankerlijer|kankerhoer|kkr|fuck|fucking|fucker|motherfucker|bitch|bitches|kys|ga\s+(toch\s+)?dood)\y$re$, '✱✱✱', 'gi')
$$;

CREATE TABLE IF NOT EXISTS public.mean_word_log (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mean_word_log_user_idx ON public.mean_word_log (user_id, created_at DESC);
-- One flag per member per day once they reach 3 times in 24 hours; admins see it in Nieuws.
CREATE TABLE IF NOT EXISTS public.mean_word_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  count integer NOT NULL,
  day date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day)
);
ALTER TABLE public.mean_word_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mean_word_flags ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.mean_word_log, public.mean_word_flags TO authenticated;
GRANT ALL ON public.mean_word_log, public.mean_word_flags TO service_role;
DROP POLICY IF EXISTS "admins see mean log" ON public.mean_word_log;
CREATE POLICY "admins see mean log" ON public.mean_word_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins see mean flags" ON public.mean_word_flags;
CREATE POLICY "admins see mean flags" ON public.mean_word_flags FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.hide_mean_words() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  clean text := public.censor(NEW.body);
  who uuid := coalesce(to_jsonb(NEW)->>'author_id', to_jsonb(NEW)->>'sender_id')::uuid;
  n integer;
BEGIN
  IF clean IS DISTINCT FROM NEW.body THEN
    NEW.body := clean;
    INSERT INTO public.mean_word_log (user_id, source) VALUES (who, TG_ARGV[0]);
    SELECT count(*) INTO n FROM public.mean_word_log WHERE user_id = who AND created_at > now() - interval '1 day';
    IF n >= 3 THEN
      INSERT INTO public.mean_word_flags (user_id, count) VALUES (who, n)
      ON CONFLICT (user_id, day) DO UPDATE SET count = excluded.count;
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.hide_mean_words() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS hide_mean_words ON public.posts;
CREATE TRIGGER hide_mean_words BEFORE INSERT OR UPDATE OF body ON public.posts FOR EACH ROW EXECUTE FUNCTION public.hide_mean_words('post');
DROP TRIGGER IF EXISTS hide_mean_words ON public.post_comments;
CREATE TRIGGER hide_mean_words BEFORE INSERT OR UPDATE OF body ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.hide_mean_words('comment');
DROP TRIGGER IF EXISTS hide_mean_words ON public.direct_messages;
CREATE TRIGGER hide_mean_words BEFORE INSERT OR UPDATE OF body ON public.direct_messages FOR EACH ROW EXECUTE FUNCTION public.hide_mean_words('dm');

-- ===== Personal goals: only you see them =====
CREATE TABLE IF NOT EXISTS public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 60),
  emoji text NOT NULL DEFAULT '🎯' CHECK (char_length(emoji) <= 8),
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.goal_checks (
  goal_id uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  day date NOT NULL,
  PRIMARY KEY (goal_id, day)
);
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_checks ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals, public.goal_checks TO authenticated;
GRANT ALL ON public.goals, public.goal_checks TO service_role;
DROP POLICY IF EXISTS "own goals" ON public.goals;
CREATE POLICY "own goals" ON public.goals FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
-- At most 5 open goals (a trigger, because a policy cannot count its own table).
CREATE OR REPLACE FUNCTION public.limit_goals() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT NEW.archived AND (SELECT count(*) FROM public.goals WHERE user_id = NEW.user_id AND NOT archived AND id <> NEW.id) >= 5 THEN
    RAISE EXCEPTION 'Je hebt al 5 doelen. Rond er eerst een af.';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.limit_goals() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS limit_goals ON public.goals;
CREATE TRIGGER limit_goals BEFORE INSERT OR UPDATE OF archived ON public.goals FOR EACH ROW EXECUTE FUNCTION public.limit_goals();
DROP POLICY IF EXISTS "own goal checks" ON public.goal_checks;
CREATE POLICY "own goal checks" ON public.goal_checks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.goals g WHERE g.id = goal_id AND g.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.goals g WHERE g.id = goal_id AND g.user_id = auth.uid()) AND day BETWEEN current_date - 1 AND current_date + 1);

-- ===== Gratitude jar: only you see it =====
CREATE TABLE IF NOT EXISTS public.gratitude_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 200),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gratitude_notes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.gratitude_notes TO authenticated;
GRANT ALL ON public.gratitude_notes TO service_role;
DROP POLICY IF EXISTS "own gratitude" ON public.gratitude_notes;
CREATE POLICY "own gratitude" ON public.gratitude_notes FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ===== Theme of the month: admins set it, members send a story, drawing or photo =====
CREATE TABLE IF NOT EXISTS public.themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month date NOT NULL UNIQUE CHECK (extract(day FROM month) = 1),
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 60),
  emoji text NOT NULL DEFAULT '✨' CHECK (char_length(emoji) <= 8),
  description text CHECK (char_length(description) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.theme_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id uuid NOT NULL REFERENCES public.themes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  age_group public.age_group NOT NULL,
  kind text NOT NULL CHECK (kind IN ('verhaal', 'tekening', 'foto')),
  body text CHECK (char_length(body) <= 3000),
  image_path text,
  show_name boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'nieuw' CHECK (status IN ('nieuw', 'gekozen', 'afgewezen')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (kind = 'verhaal' AND char_length(btrim(coalesce(body, ''))) >= 10 OR kind <> 'verhaal' AND image_path IS NOT NULL)
);
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_entries ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.themes TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.theme_entries TO authenticated;
GRANT UPDATE (status) ON public.theme_entries TO authenticated;
GRANT ALL ON public.themes, public.theme_entries TO service_role;
DROP POLICY IF EXISTS "everyone sees themes" ON public.themes;
CREATE POLICY "everyone sees themes" ON public.themes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admins manage themes" ON public.themes;
CREATE POLICY "admins manage themes" ON public.themes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- Your own entries, admins all, and chosen entries of your own age band.
DROP POLICY IF EXISTS "see entries" ON public.theme_entries;
CREATE POLICY "see entries" ON public.theme_entries FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
  OR (status = 'gekozen' AND age_group = public.my_age_group()));
DROP POLICY IF EXISTS "send entry" ON public.theme_entries;
CREATE POLICY "send entry" ON public.theme_entries FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND status = 'nieuw' AND NOT public.is_timed_out(auth.uid())
  AND age_group = (SELECT p.age_group FROM public.profiles p WHERE p.id = auth.uid())
  AND (image_path IS NULL OR split_part(image_path, '/', 1) = auth.uid()::text));
-- At most 3 entries per member per theme.
CREATE OR REPLACE FUNCTION public.limit_theme_entries() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.theme_entries WHERE user_id = NEW.user_id AND theme_id = NEW.theme_id) >= 3 THEN
    RAISE EXCEPTION 'Je hebt al 3 inzendingen voor dit thema.';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.limit_theme_entries() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS limit_theme_entries ON public.theme_entries;
CREATE TRIGGER limit_theme_entries BEFORE INSERT ON public.theme_entries FOR EACH ROW EXECUTE FUNCTION public.limit_theme_entries();
DROP POLICY IF EXISTS "remove own entry" ON public.theme_entries;
CREATE POLICY "remove own entry" ON public.theme_entries FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins choose entries" ON public.theme_entries;
CREATE POLICY "admins choose entries" ON public.theme_entries FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Pictures for theme entries: private bucket, "<uid>/<file>". Readable by the maker, admins, and
-- members of the same age band once the entry is chosen.
INSERT INTO storage.buckets (id, name, public) VALUES ('theme-entries', 'theme-entries', false) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "upload own theme picture" ON storage.objects;
CREATE POLICY "upload own theme picture" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'theme-entries' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "read theme pictures" ON storage.objects;
CREATE POLICY "read theme pictures" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'theme-entries' AND (
    (storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.theme_entries e WHERE e.image_path = name AND e.status = 'gekozen' AND e.age_group = public.my_age_group())));
DROP POLICY IF EXISTS "remove own theme picture" ON storage.objects;
CREATE POLICY "remove own theme picture" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'theme-entries' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));

-- Chosen entries with the maker's name only if they said so.
CREATE OR REPLACE FUNCTION public.theme_showcase(_theme uuid)
RETURNS TABLE (id uuid, kind text, body text, image_path text, maker text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id, e.kind, e.body, e.image_path, CASE WHEN e.show_name THEN p.display_name END, e.created_at
  FROM public.theme_entries e LEFT JOIN public.profiles p ON p.id = e.user_id
  WHERE e.theme_id = _theme AND e.status = 'gekozen' AND e.age_group = public.my_age_group()
  ORDER BY e.created_at DESC
$$;
REVOKE ALL ON FUNCTION public.theme_showcase(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.theme_showcase(uuid) TO authenticated;

-- ===== Nieuws for admins: also repeat mean words and theme entries =====
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
    SELECT 'gemeen', f.id, coalesce(p.display_name, 'Lid') || ' gebruikte vaak gemene woorden', f.count || ' keer in 24 uur', f.created_at
    FROM public.mean_word_flags f LEFT JOIN public.profiles p ON p.id = f.user_id
    UNION ALL
    SELECT 'inzending', e.id, coalesce(t.title, 'Thema') || ': ' || left(coalesce(nullif(e.body, ''), CASE e.kind WHEN 'tekening' THEN 'een tekening' ELSE 'een foto' END), 100), coalesce(p.display_name, 'Lid'), e.created_at
    FROM public.theme_entries e JOIN public.themes t ON t.id = e.theme_id LEFT JOIN public.profiles p ON p.id = e.user_id
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
