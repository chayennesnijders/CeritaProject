BEGIN;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_parent boolean NOT NULL DEFAULT false;

REVOKE UPDATE (is_parent) ON public.profiles FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.guard_parent_profile()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon')
     AND coalesce(current_setting('cerita.become_parent', true), '') <> 'on' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.is_parent := false;
    ELSE
      NEW.is_parent := OLD.is_parent;
    END IF;
  END IF;
  IF NEW.is_parent THEN
    NEW.birthdate := NULL;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_parent_profile ON public.profiles;
CREATE TRIGGER guard_parent_profile BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_parent_profile();

CREATE OR REPLACE FUNCTION public.become_parent()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND birthdate IS NOT NULL) THEN
    RAISE EXCEPTION 'Dit account is al een jongeren-account. Maak voor ouders een apart account aan.';
  END IF;
  PERFORM set_config('cerita.become_parent', 'on', true);
  UPDATE public.profiles SET is_parent = true WHERE id = auth.uid();
  PERFORM set_config('cerita.become_parent', '', true);
END $$;
REVOKE ALL ON FUNCTION public.become_parent() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.become_parent() TO authenticated;

CREATE OR REPLACE FUNCTION public.can_use_community()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.birthdate IS NOT NULL AND NOT p.is_parent
      AND date_part('year', age(p.birthdate)) BETWEEN 13 AND 27)
$$;

CREATE OR REPLACE FUNCTION public.my_age_group()
RETURNS public.age_group LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT age_group FROM public.profiles WHERE id = auth.uid() AND birthdate IS NOT NULL AND NOT is_parent
$$;

CREATE TABLE IF NOT EXISTS public.parent_checks (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('zelf', 'kind', 'thema')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day, kind)
);
ALTER TABLE public.parent_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "eigen ouder-vinkjes" ON public.parent_checks;
CREATE POLICY "eigen ouder-vinkjes" ON public.parent_checks FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
REVOKE ALL ON public.parent_checks FROM anon;
GRANT SELECT, INSERT, DELETE ON public.parent_checks TO authenticated;

COMMIT;
