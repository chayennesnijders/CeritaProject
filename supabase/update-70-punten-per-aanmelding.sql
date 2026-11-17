-- Update na update-69: nieuwe puntenregels voor ambassadeurs. Punten komen alleen nog van aanmeldingen via
-- je eigen link: 3 punten per aanmelding (zelfde als POINTS_PER_SIGNUP in src/lib/ambassador.ts).
-- Posts, challenges en offline delen zijn manieren om aanmeldingen te krijgen; ze geven zelf geen punten meer.
-- Plak dit in Supabase → SQL Editor en klik Run. Je kunt het veilig vaker draaien.

CREATE OR REPLACE FUNCTION public.ambassador_points(_user uuid) RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 3 * (SELECT count(*) FROM public.waitlist w WHERE w.source = 'amb-' || a.code)
  FROM public.ambassadors a WHERE a.user_id = _user
$$;
REVOKE ALL ON FUNCTION public.ambassador_points(uuid) FROM PUBLIC, anon, authenticated;

-- For the readiness check in Beheer → Livegang.
CREATE OR REPLACE FUNCTION public.points_per_signup() RETURNS integer
LANGUAGE sql IMMUTABLE AS $$ SELECT 3 $$;
GRANT EXECUTE ON FUNCTION public.points_per_signup() TO authenticated;
