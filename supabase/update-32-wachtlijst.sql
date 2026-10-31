-- Update na update-31: de wachtlijst voor de app (app.ceritaproject.nl/wachtlijst).
-- Plak dit in Supabase → SQL Editor → New query → Run. Per ongeluk twee keer gedaan? Geen probleem.
BEGIN;

-- ===== 0081_waitlist =====
-- Waiting list for the app (public page /wachtlijst, no account needed): an e-mail address, age and
-- which phone someone has (Play Store / App Store), so Android users can be mailed first. Only
-- admins can read it; signing up goes through join_waitlist() only. Under 16 needs a parent's okay.
CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL CHECK (char_length(email) BETWEEN 5 AND 254 AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
  age integer NOT NULL CHECK (age BETWEEN 13 AND 120),
  store text NOT NULL CHECK (store IN ('play', 'apple', 'beide')),
  parent_ok boolean NOT NULL DEFAULT false,
  source text CHECK (char_length(source) <= 40),
  created_at timestamptz NOT NULL DEFAULT now(),
  mailed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email_key ON public.waitlist (lower(email));
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE, DELETE ON public.waitlist TO authenticated;
GRANT ALL ON public.waitlist TO service_role;
DROP POLICY IF EXISTS "admins read waitlist" ON public.waitlist;
CREATE POLICY "admins read waitlist" ON public.waitlist FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins update waitlist" ON public.waitlist;
CREATE POLICY "admins update waitlist" ON public.waitlist FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins remove from waitlist" ON public.waitlist;
CREATE POLICY "admins remove from waitlist" ON public.waitlist FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Sign up (or update your answers when you sign up again with the same address). Says nothing about
-- whether the address was already on the list, so the list can't be probed.
CREATE OR REPLACE FUNCTION public.join_waitlist(_email text, _age integer, _store text, _parent_ok boolean, _source text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE mail text := lower(trim(coalesce(_email, '')));
BEGIN
  IF mail !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' OR char_length(mail) > 254 THEN RAISE EXCEPTION 'Vul een goed e-mailadres in.'; END IF;
  IF _age IS NULL OR _age < 13 THEN RAISE EXCEPTION 'De app is vanaf 13 jaar.'; END IF;
  IF _age > 120 THEN RAISE EXCEPTION 'Kies je leeftijd.'; END IF;
  IF _store NOT IN ('play', 'apple', 'beide') THEN RAISE EXCEPTION 'Kies wat voor telefoon je hebt.'; END IF;
  IF _age < 16 AND NOT coalesce(_parent_ok, false) THEN RAISE EXCEPTION 'Vraag eerst je ouder of verzorger.'; END IF;
  INSERT INTO public.waitlist (email, age, store, parent_ok, source)
  VALUES (mail, _age, _store, coalesce(_parent_ok, false), nullif(left(trim(coalesce(_source, '')), 40), ''))
  ON CONFLICT ((lower(email))) DO UPDATE
    SET age = excluded.age, store = excluded.store, parent_ok = excluded.parent_ok;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.join_waitlist(text, integer, text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_waitlist(text, integer, text, boolean, text) TO anon, authenticated;

-- How many are on the list (only the number), for "al 120 jongeren staan op de wachtlijst".
CREATE OR REPLACE FUNCTION public.waitlist_count()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.waitlist
$$;
REVOKE ALL ON FUNCTION public.waitlist_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.waitlist_count() TO anon, authenticated;

COMMIT;
