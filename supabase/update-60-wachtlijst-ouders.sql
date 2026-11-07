BEGIN;

-- Ouders en verzorgers op dezelfde wachtlijst als jongeren. Zij geven geen leeftijd op.
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'jongere';
ALTER TABLE public.waitlist DROP CONSTRAINT IF EXISTS waitlist_kind_check;
ALTER TABLE public.waitlist ADD CONSTRAINT waitlist_kind_check CHECK (kind IN ('jongere', 'ouder'));
ALTER TABLE public.waitlist ALTER COLUMN age DROP NOT NULL;
ALTER TABLE public.waitlist DROP CONSTRAINT IF EXISTS waitlist_age_check;
ALTER TABLE public.waitlist ADD CONSTRAINT waitlist_age_check
  CHECK ((kind = 'ouder' AND age IS NULL) OR (kind = 'jongere' AND age BETWEEN 13 AND 120));

-- Aanmelden als jongere of als ouder. Zegt niet of het adres er al op stond.
CREATE OR REPLACE FUNCTION public.join_waitlist(_email text, _age integer, _store text, _parent_ok boolean, _source text, _kind text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE mail text := lower(trim(coalesce(_email, '')));
BEGIN
  IF mail !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' OR char_length(mail) > 254 THEN RAISE EXCEPTION 'Vul een goed e-mailadres in.'; END IF;
  IF _kind NOT IN ('jongere', 'ouder') THEN RAISE EXCEPTION 'Kies of je jongere of ouder bent.'; END IF;
  IF _store NOT IN ('play', 'apple', 'beide') THEN RAISE EXCEPTION 'Kies wat voor telefoon je hebt.'; END IF;
  IF _kind = 'jongere' THEN
    IF _age IS NULL OR _age < 13 THEN RAISE EXCEPTION 'De app is vanaf 13 jaar.'; END IF;
    IF _age > 120 THEN RAISE EXCEPTION 'Kies je leeftijd.'; END IF;
    IF _age < 16 AND NOT coalesce(_parent_ok, false) THEN RAISE EXCEPTION 'Vraag eerst je ouder of verzorger.'; END IF;
  END IF;
  INSERT INTO public.waitlist (email, age, store, parent_ok, source, kind)
  VALUES (mail, CASE WHEN _kind = 'ouder' THEN NULL ELSE _age END, _store,
          _kind = 'jongere' AND coalesce(_parent_ok, false),
          nullif(left(trim(coalesce(_source, '')), 40), ''), _kind)
  ON CONFLICT ((lower(email))) DO UPDATE
    SET age = excluded.age, store = excluded.store, parent_ok = excluded.parent_ok, kind = excluded.kind;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.join_waitlist(text, integer, text, boolean, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_waitlist(text, integer, text, boolean, text, text) TO anon, authenticated;

-- "Al 120 jongeren staan op de wachtlijst": telt alleen jongeren.
CREATE OR REPLACE FUNCTION public.waitlist_count()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.waitlist WHERE kind = 'jongere'
$$;

COMMIT;
