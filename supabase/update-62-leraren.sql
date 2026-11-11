-- Update 62: leraar-accounts.
-- Teachers get their own account type (profiles.is_teacher), like parents: no birthdate, so they
-- never reach groups, chats or other profiles (can_use_community() and my_age_group() need one).
-- A teacher becomes a teacher only through become_teacher(code) with a working school code; the
-- code links the account to that school's licence, which unlocks the lessons in the app.
BEGIN;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_teacher boolean NOT NULL DEFAULT false;
REVOKE UPDATE (is_teacher) ON public.profiles FROM anon, authenticated;

-- Members can never switch is_teacher themselves, and a teacher never gets a birthdate.
-- SECURITY INVOKER (the default), otherwise current_user is never 'authenticated'.
CREATE OR REPLACE FUNCTION public.guard_teacher_profile()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon')
     AND coalesce(current_setting('cerita.become_teacher', true), '') <> 'on' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.is_teacher := false;
    ELSE
      NEW.is_teacher := OLD.is_teacher;
    END IF;
  END IF;
  IF NEW.is_teacher THEN
    NEW.birthdate := NULL;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_teacher_profile ON public.profiles;
CREATE TRIGGER guard_teacher_profile BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_teacher_profile();

-- Which school (licence) a teacher belongs to. Written only by become_teacher().
CREATE TABLE IF NOT EXISTS public.teachers (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  license_id uuid REFERENCES public.school_licenses(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS teachers_license ON public.teachers (license_id);
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "eigen leraarkoppeling" ON public.teachers;
CREATE POLICY "eigen leraarkoppeling" ON public.teachers FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
REVOKE ALL ON public.teachers FROM anon;
GRANT SELECT ON public.teachers TO authenticated;

-- Turn this (new, birthdate-less) account into a teacher account linked to the school of `_code`.
-- Also used later to enter a new code when the school renews its licence.
CREATE OR REPLACE FUNCTION public.become_teacher(_code text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  plain text := upper(regexp_replace(coalesce(_code, ''), '[^A-Za-z0-9]', '', 'g'));
  lic public.school_licenses%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND birthdate IS NOT NULL) THEN
    RAISE EXCEPTION 'Dit is een jongeren-account. Maak voor school een apart account aan.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_parent) THEN
    RAISE EXCEPTION 'Dit is een ouder-account. Maak voor school een apart account aan.';
  END IF;
  IF length(plain) <> 8 THEN
    RAISE EXCEPTION 'Een schoolcode heeft 8 tekens, bijvoorbeeld KX7P-2M9Q.';
  END IF;
  SELECT * INTO lic FROM public.school_licenses
    WHERE code = substr(plain, 1, 4) || '-' || substr(plain, 5, 4);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deze schoolcode kennen we niet. Controleer hem nog eens.';
  END IF;
  IF NOT lic.active OR lic.valid_until < (now() AT TIME ZONE 'Europe/Amsterdam')::date THEN
    RAISE EXCEPTION 'Deze schoolcode is verlopen of uitgezet. Vraag je school om een nieuwe.';
  END IF;
  INSERT INTO public.teachers (user_id, license_id) VALUES (auth.uid(), lic.id)
    ON CONFLICT (user_id) DO UPDATE SET license_id = excluded.license_id;
  PERFORM set_config('cerita.become_teacher', 'on', true);
  UPDATE public.profiles SET is_teacher = true WHERE id = auth.uid();
  PERFORM set_config('cerita.become_teacher', '', true);
  RETURN lic.school;
END $$;
REVOKE ALL ON FUNCTION public.become_teacher(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.become_teacher(text) TO authenticated;

-- A teacher account is never also a parent account.
CREATE OR REPLACE FUNCTION public.become_parent()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND birthdate IS NOT NULL) THEN
    RAISE EXCEPTION 'Dit account is al een jongeren-account. Maak voor ouders een apart account aan.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_teacher) THEN
    RAISE EXCEPTION 'Dit is een leraar-account. Maak voor ouders een apart account aan.';
  END IF;
  PERFORM set_config('cerita.become_parent', 'on', true);
  UPDATE public.profiles SET is_parent = true WHERE id = auth.uid();
  PERFORM set_config('cerita.become_parent', '', true);
END $$;

COMMIT;
