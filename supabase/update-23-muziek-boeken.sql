-- Update na update-22: muziek (playlists en liedjestips) en boeken (boekenkast met sterren).
-- Plak dit in Supabase → SQL Editor → New query → Run. Per ongeluk twee keer gedaan? Geen probleem.

-- ===== 0072_music_books =====
-- Music and books. Admins add playlists (Spotify, YouTube or Apple Music) and book tips, each with a
-- minimum age. Members share song tips with their own age band and like them, and keep a private
-- bookshelf (want to read / reading / read) with star ratings; others only see the average.

-- Only links to these music services are allowed (the app turns them into a player).
CREATE OR REPLACE FUNCTION public.is_music_url(_url text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT _url ~ '^https://(open\.spotify\.com|(www\.|music\.)?youtube\.com|youtu\.be|music\.apple\.com)/[A-Za-z0-9/_?=&.%-]+$'
    AND char_length(_url) <= 300
$$;

CREATE TABLE IF NOT EXISTS public.playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 60),
  emoji text NOT NULL DEFAULT '🎵' CHECK (char_length(emoji) <= 8),
  description text CHECK (char_length(description) <= 200),
  url text NOT NULL CHECK (public.is_music_url(url)),
  min_age integer NOT NULL DEFAULT 12 CHECK (min_age IN (12, 16)),
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  author text NOT NULL CHECK (char_length(author) BETWEEN 1 AND 120),
  description text CHECK (char_length(description) <= 600),
  theme text CHECK (char_length(theme) <= 40),
  isbn text CHECK (isbn ~ '^[0-9]{10}([0-9]{3})?$'),
  min_age integer NOT NULL DEFAULT 12 CHECK (min_age IN (12, 16)),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlists, public.books TO authenticated;
GRANT ALL ON public.playlists, public.books TO service_role;
DROP POLICY IF EXISTS "see playlists for my age" ON public.playlists;
CREATE POLICY "see playlists for my age" ON public.playlists FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR coalesce(public.my_age(), 0) >= min_age);
DROP POLICY IF EXISTS "admins manage playlists" ON public.playlists;
CREATE POLICY "admins manage playlists" ON public.playlists FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "see books for my age" ON public.books;
CREATE POLICY "see books for my age" ON public.books FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR coalesce(public.my_age(), 0) >= min_age);
DROP POLICY IF EXISTS "admins manage books" ON public.books;
CREATE POLICY "admins manage books" ON public.books FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Your own bookshelf: nobody else sees it.
CREATE TABLE IF NOT EXISTS public.book_shelf (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('wil-lezen', 'aan-het-lezen', 'gelezen')),
  rating smallint CHECK (rating BETWEEN 1 AND 5),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, book_id)
);
ALTER TABLE public.book_shelf ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_shelf TO authenticated;
GRANT ALL ON public.book_shelf TO service_role;
DROP POLICY IF EXISTS "own shelf" ON public.book_shelf;
CREATE POLICY "own shelf" ON public.book_shelf FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Average stars per book without showing who gave them.
CREATE OR REPLACE FUNCTION public.book_ratings()
RETURNS TABLE (book_id uuid, average numeric, ratings integer, readers integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.id, round(avg(s.rating), 1), count(s.rating)::int, count(s.user_id) FILTER (WHERE s.status = 'gelezen')::int
  FROM public.books b JOIN public.book_shelf s ON s.book_id = b.id
  WHERE public.has_role(auth.uid(), 'admin') OR coalesce(public.my_age(), 0) >= b.min_age
  GROUP BY b.id
$$;
REVOKE ALL ON FUNCTION public.book_ratings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.book_ratings() TO authenticated;

-- Song tips from members, only visible within their own age band.
CREATE TABLE IF NOT EXISTS public.song_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  artist text NOT NULL CHECK (char_length(artist) BETWEEN 1 AND 80),
  url text CHECK (url IS NULL OR public.is_music_url(url)),
  age_group public.age_group NOT NULL,
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS song_tips_band_idx ON public.song_tips (age_group, created_at DESC);
CREATE TABLE IF NOT EXISTS public.song_tip_likes (
  tip_id uuid NOT NULL REFERENCES public.song_tips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (tip_id, user_id)
);
ALTER TABLE public.song_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_tip_likes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, DELETE ON public.song_tips TO authenticated;
GRANT UPDATE (hidden) ON public.song_tips TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.song_tip_likes TO authenticated;
GRANT ALL ON public.song_tips, public.song_tip_likes TO service_role;

CREATE OR REPLACE FUNCTION public.can_see_song_tip(_tip uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.song_tips t WHERE t.id = _tip AND (
    public.has_role(auth.uid(), 'admin') OR t.user_id = auth.uid()
    OR (NOT t.hidden AND public.can_use_community() AND t.age_group = public.my_age_group())))
$$;
REVOKE ALL ON FUNCTION public.can_see_song_tip(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_see_song_tip(uuid) TO authenticated;

DROP POLICY IF EXISTS "see song tips" ON public.song_tips;
CREATE POLICY "see song tips" ON public.song_tips FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR user_id = auth.uid()
  OR (NOT hidden AND public.can_use_community() AND age_group = public.my_age_group()));
DROP POLICY IF EXISTS "remove own song tip" ON public.song_tips;
CREATE POLICY "remove own song tip" ON public.song_tips FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins hide song tips" ON public.song_tips;
CREATE POLICY "admins hide song tips" ON public.song_tips FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "see likes" ON public.song_tip_likes;
CREATE POLICY "see likes" ON public.song_tip_likes FOR SELECT TO authenticated USING (public.can_see_song_tip(tip_id));
DROP POLICY IF EXISTS "like" ON public.song_tip_likes;
CREATE POLICY "like" ON public.song_tip_likes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_see_song_tip(tip_id));
DROP POLICY IF EXISTS "unlike" ON public.song_tip_likes;
CREATE POLICY "unlike" ON public.song_tip_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Shares a song tip with your own age band (at most 5 a day).
CREATE OR REPLACE FUNCTION public.add_song_tip(_title text, _artist text, _url text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  band public.age_group;
  u text := nullif(btrim(coalesce(_url, '')), '');
  tid uuid;
BEGIN
  IF me IS NULL OR NOT public.can_use_community() OR public.is_timed_out(me) THEN
    RAISE EXCEPTION 'Je kunt nu geen liedje delen.';
  END IF;
  SELECT age_group INTO band FROM public.profiles WHERE id = me AND birthdate IS NOT NULL;
  IF band IS NULL THEN RAISE EXCEPTION 'Vul eerst je geboortedatum in.'; END IF;
  IF u IS NOT NULL AND NOT public.is_music_url(u) THEN
    RAISE EXCEPTION 'Gebruik een link van Spotify, YouTube of Apple Music (of laat de link leeg).';
  END IF;
  IF (SELECT count(*) FROM public.song_tips WHERE user_id = me AND created_at > now() - interval '1 day') >= 5 THEN
    RAISE EXCEPTION 'Je hebt vandaag al 5 liedjes gedeeld. Morgen weer!';
  END IF;
  INSERT INTO public.song_tips (user_id, title, artist, url, age_group)
  VALUES (me, left(btrim(_title), 80), left(btrim(_artist), 80), u, band) RETURNING id INTO tid;
  RETURN tid;
END $$;
REVOKE ALL ON FUNCTION public.add_song_tip(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_song_tip(text, text, text) TO authenticated;

-- A few book tips to start with (admins can change or remove them).
INSERT INTO public.books (title, author, description, theme, min_age)
SELECT * FROM (VALUES
  ('Wonder', 'R.J. Palacio', 'August ziet er anders uit dan andere kinderen en gaat voor het eerst naar een gewone school. Een boek over vriendschap, pesten en lief zijn voor elkaar.', 'Vriendschap', 12),
  ('Het Achterhuis', 'Anne Frank', 'Het echte dagboek van Anne Frank, die zich in de Tweede Wereldoorlog met haar familie verstopte in Amsterdam.', 'Dagboek', 12),
  ('Eleanor & Park', 'Rainbow Rowell', 'Twee tieners die zich allebei een buitenbeentje voelen, leren elkaar kennen in de schoolbus.', 'Liefde', 16),
  ('Turtles All the Way Down', 'John Green', 'Aza leeft met angst en dwanggedachten en probeert ondertussen een mysterie op te lossen. Een eerlijk verhaal over hoe het voelt om vast te zitten in je hoofd.', 'Angst', 16)
) AS v(title, author, description, theme, min_age)
WHERE NOT EXISTS (SELECT 1 FROM public.books);
