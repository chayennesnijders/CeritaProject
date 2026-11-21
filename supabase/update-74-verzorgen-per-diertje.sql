-- Update na update-73: eten geven, spelen en knuffelen tellen per diertje.
-- Eerst gold verzorgen voor al je diertjes tegelijk: deed je het bij je eerste diertje,
-- dan stond het bij je tweede ook al op "gedaan".
-- Plak dit in Supabase → SQL Editor en klik Run. Je kunt het veilig vaker draaien.

ALTER TABLE public.pet_care ADD COLUMN IF NOT EXISTS pet_ref text NOT NULL DEFAULT 'main';

-- One row per pet, day and action (was: per member, day and action).
ALTER TABLE public.pet_care DROP CONSTRAINT IF EXISTS pet_care_pkey;
ALTER TABLE public.pet_care ADD CONSTRAINT pet_care_pkey PRIMARY KEY (user_id, pet_ref, care_date, action);

-- Only your own main pet or one of your own companions.
DROP POLICY IF EXISTS "own care add" ON public.pet_care;
CREATE POLICY "own care add" ON public.pet_care FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND care_date = current_date
    AND (pet_ref = 'main' OR EXISTS (SELECT 1 FROM public.companions c WHERE c.id::text = pet_ref AND c.user_id = auth.uid())));

-- Check for Livegang: exists once this update has run.
CREATE OR REPLACE FUNCTION public.care_per_pet() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT true $$;
GRANT EXECUTE ON FUNCTION public.care_per_pet() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
