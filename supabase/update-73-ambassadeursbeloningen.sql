-- Update na update-72: de exclusieve ambassadeursbeloningen voor het diertje.
--   💖 Ambassadeurssjerp (outfit)  vanaf Creator    (30 punten)
--   ✨ Cerita-glitter (kleur)       vanaf Influencer (60 punten)
-- Ze gaan pas open als een beheerder in Beheer → Ambassadeurs de beloningen aanzet (bij de lancering).
-- Beheerders kunnen ze altijd uitproberen. Een trigger zorgt dat niemand ze zonder recht kan aanzetten.
-- Plak dit in Supabase → SQL Editor en klik Run. Je kunt het veilig vaker draaien.

CREATE TABLE IF NOT EXISTS public.ambassador_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  rewards_live boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.ambassador_settings (id) VALUES (true) ON CONFLICT DO NOTHING;
ALTER TABLE public.ambassador_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ambassador_settings FROM anon, authenticated;
GRANT SELECT ON public.ambassador_settings TO authenticated;
DROP POLICY IF EXISTS "iedereen leest of beloningen aan staan" ON public.ambassador_settings;
CREATE POLICY "iedereen leest of beloningen aan staan" ON public.ambassador_settings FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.set_ambassador_rewards(_live boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Alleen voor beheerders.'; END IF;
  UPDATE public.ambassador_settings SET rewards_live = coalesce(_live, false), updated_at = now() WHERE id;
  RETURN coalesce(_live, false);
END $$;

-- What you may wear: thresholds are the Creator (30) and Influencer (60) levels in src/lib/ambassador.ts.
CREATE OR REPLACE FUNCTION public.exclusive_unlocks(_user uuid)
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH s AS (SELECT coalesce((SELECT rewards_live FROM public.ambassador_settings WHERE id), false) AS live),
       a AS (SELECT public.ambassador_points(user_id) AS pts FROM public.ambassadors WHERE user_id = _user AND active)
  SELECT json_build_object(
    'live', (SELECT live FROM s),
    'ambassador', EXISTS (SELECT 1 FROM a),
    'outfit', public.has_role(_user, 'admin') OR ((SELECT live FROM s) AND coalesce((SELECT pts FROM a), 0) >= 30),
    'color',  public.has_role(_user, 'admin') OR ((SELECT live FROM s) AND coalesce((SELECT pts FROM a), 0) >= 60))
$$;
CREATE OR REPLACE FUNCTION public.my_exclusive_unlocks()
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.exclusive_unlocks(auth.uid())
$$;

-- Members can't put on the exclusive outfit or colour without the right (the app also hides it).
CREATE OR REPLACE FUNCTION public.guard_exclusive_pet_items()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE u json;
BEGIN
  IF current_user <> 'authenticated' THEN RETURN NEW; END IF;
  IF (NEW.outfit = 'ambassadeur' AND (TG_OP = 'INSERT' OR OLD.outfit IS DISTINCT FROM NEW.outfit))
     OR (NEW.color = 'cerita' AND (TG_OP = 'INSERT' OR OLD.color IS DISTINCT FROM NEW.color)) THEN
    u := public.my_exclusive_unlocks();
    IF NEW.outfit = 'ambassadeur' AND NOT (u->>'outfit')::boolean THEN RAISE EXCEPTION 'Deze outfit is voor ambassadeurs.'; END IF;
    IF NEW.color = 'cerita' AND NOT (u->>'color')::boolean THEN RAISE EXCEPTION 'Deze kleur is voor ambassadeurs.'; END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_exclusive_pet_items ON public.pets;
CREATE TRIGGER guard_exclusive_pet_items BEFORE INSERT OR UPDATE ON public.pets
  FOR EACH ROW EXECUTE FUNCTION public.guard_exclusive_pet_items();
DROP TRIGGER IF EXISTS guard_exclusive_pet_items ON public.companions;
CREATE TRIGGER guard_exclusive_pet_items BEFORE INSERT OR UPDATE ON public.companions
  FOR EACH ROW EXECUTE FUNCTION public.guard_exclusive_pet_items();

REVOKE ALL ON FUNCTION public.exclusive_unlocks(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_ambassador_rewards(boolean), public.my_exclusive_unlocks() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_ambassador_rewards(boolean), public.my_exclusive_unlocks() TO authenticated;
