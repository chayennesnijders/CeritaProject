-- ===== 0083_slow_down_flooding =====
-- Against spam in groups: at most 5 group posts per minute per member (admins and coaches excepted).
-- Whoever goes faster gets a friendly "rustig aan" and can post again a moment later.
CREATE OR REPLACE FUNCTION public.slow_down_posts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(NEW.author_id, 'admin') OR public.is_coach(NEW.author_id) THEN RETURN NEW; END IF;
  IF (SELECT count(*) FROM public.posts
      WHERE author_id = NEW.author_id AND created_at > now() - interval '1 minute') >= 5 THEN
    RAISE EXCEPTION 'Rustig aan 🙂 Je hebt net al een paar berichten gestuurd. Wacht even voordat je weer iets post.';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.slow_down_posts() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS slow_down_posts ON public.posts;
CREATE TRIGGER slow_down_posts BEFORE INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION public.slow_down_posts();
