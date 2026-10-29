-- Stories can be for everyone (12+) or only for members of 16 and older.
-- The database enforces it: members under 16 (or without a birthdate) never get 16+ stories.
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS min_age integer NOT NULL DEFAULT 12;
ALTER TABLE public.articles DROP CONSTRAINT IF EXISTS articles_min_age_check;
ALTER TABLE public.articles ADD CONSTRAINT articles_min_age_check CHECK (min_age IN (12, 16));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.my_age() RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT date_part('year', age(birthdate))::int FROM public.profiles WHERE id = auth.uid() AND birthdate IS NOT NULL
$$;
REVOKE ALL ON FUNCTION public.my_age() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_age() TO authenticated;
--> statement-breakpoint
DROP POLICY IF EXISTS "read articles" ON public.articles;
CREATE POLICY "read articles" ON public.articles FOR SELECT TO authenticated
  USING ((is_published AND coalesce(public.my_age(), 12) >= min_age) OR public.has_role(auth.uid(), 'admin'));
