-- Update na update-74: Riti, het exclusieve diertje voor de eerste 500 jongeren op de wachtlijst.
-- Wie zich als jongere bij de eerste 500 op de wachtlijst zette, kan met hetzelfde e-mailadres
-- Riti (het roze beertje van CeritaProject) als diertje kiezen. Beheerders kunnen het altijd uitproberen.
-- Op de wachtlijstpagina staat hoeveel plekken er nog over zijn.
-- Plak dit in Supabase → SQL Editor en klik Run. Je kunt het veilig vaker draaien.

-- Is this account one of the first 500 young people on the waitlist (same e-mail address)?
CREATE OR REPLACE FUNCTION public.is_pioneer(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM (
      SELECT lower(email) AS email, row_number() OVER (ORDER BY created_at, id) AS place
      FROM public.waitlist WHERE kind = 'jongere'
    ) w
    JOIN auth.users u ON lower(u.email) = w.email
    WHERE u.id = _user AND w.place <= 500)
$$;
REVOKE ALL ON FUNCTION public.is_pioneer(uuid) FROM PUBLIC, anon, authenticated;

-- How many of the 500 places are still free (shown on the waitlist page, no personal data).
CREATE OR REPLACE FUNCTION public.pioneer_places_left()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT greatest(0, 500 - (SELECT count(*) FROM public.waitlist WHERE kind = 'jongere'))::int
$$;
REVOKE ALL ON FUNCTION public.pioneer_places_left() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pioneer_places_left() TO anon, authenticated;

-- The exclusive items (update-73) plus Riti.
CREATE OR REPLACE FUNCTION public.exclusive_unlocks(_user uuid)
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH s AS (SELECT coalesce((SELECT rewards_live FROM public.ambassador_settings WHERE id), false) AS live),
       a AS (SELECT public.ambassador_points(user_id) AS pts FROM public.ambassadors WHERE user_id = _user AND active)
  SELECT json_build_object(
    'live', (SELECT live FROM s),
    'ambassador', EXISTS (SELECT 1 FROM a),
    'outfit', public.has_role(_user, 'admin') OR ((SELECT live FROM s) AND coalesce((SELECT pts FROM a), 0) >= 30),
    'color',  public.has_role(_user, 'admin') OR ((SELECT live FROM s) AND coalesce((SELECT pts FROM a), 0) >= 60),
    'pioneer', public.has_role(_user, 'admin') OR public.is_pioneer(_user))
$$;
REVOKE ALL ON FUNCTION public.exclusive_unlocks(uuid) FROM PUBLIC, anon, authenticated;

-- Nobody picks Riti without the right (the app also hides it).
CREATE OR REPLACE FUNCTION public.guard_exclusive_pet_items()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE u json;
BEGIN
  IF current_user <> 'authenticated' THEN RETURN NEW; END IF;
  IF (NEW.outfit = 'ambassadeur' AND (TG_OP = 'INSERT' OR OLD.outfit IS DISTINCT FROM NEW.outfit))
     OR (NEW.color = 'cerita' AND (TG_OP = 'INSERT' OR OLD.color IS DISTINCT FROM NEW.color))
     OR (NEW.species = 'riti' AND (TG_OP = 'INSERT' OR OLD.species IS DISTINCT FROM NEW.species)) THEN
    u := public.my_exclusive_unlocks();
    IF NEW.outfit = 'ambassadeur' AND NOT (u->>'outfit')::boolean THEN RAISE EXCEPTION 'Deze outfit is voor ambassadeurs.'; END IF;
    IF NEW.color = 'cerita' AND NOT (u->>'color')::boolean THEN RAISE EXCEPTION 'Deze kleur is voor ambassadeurs.'; END IF;
    IF NEW.species = 'riti' AND NOT coalesce((u->>'pioneer')::boolean, false) THEN RAISE EXCEPTION 'Riti is voor de eerste 500 op de wachtlijst.'; END IF;
  END IF;
  RETURN NEW;
END $$;

NOTIFY pgrst, 'reload schema';
