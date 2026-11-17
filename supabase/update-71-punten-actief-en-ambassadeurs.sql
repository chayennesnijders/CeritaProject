-- Update na update-70: nieuwe puntenregels voor ambassadeurs.
--   3 punten  per aanmelding (wachtlijst) of download (account in de app) via je eigen link
--  +2 punten  als dat account een week actief is (actief op minstens 5 van de eerste 7 dagen)
--   3 punten  per nieuwe ambassadeur die jij erbij haalt en die meedoet (akkoord met de afspraken)
--  +2 punten  als die nieuwe ambassadeur zijn eerste aanmelding of download binnen heeft
-- Ambassadeurs zien alleen aantallen, nooit wie. Actief zijn wordt alleen per dag geteld (ja/nee), niet wat iemand doet.
-- Plak dit in Supabase → SQL Editor en klik Run. Je kunt het veilig vaker draaien.

-- Which link someone used when they made their account (amb-<code>). Admin-only.
CREATE TABLE IF NOT EXISTS public.referrals (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source ~ '^amb-[a-z0-9]{2,20}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS referrals_source ON public.referrals (source);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.referrals FROM anon, authenticated;
GRANT SELECT ON public.referrals TO authenticated;
DROP POLICY IF EXISTS "beheerders zien verwijzingen" ON public.referrals;
CREATE POLICY "beheerders zien verwijzingen" ON public.referrals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Days on which a member opened the app (only the date). Nobody reads this directly.
CREATE TABLE IF NOT EXISTS public.active_days (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day date NOT NULL,
  PRIMARY KEY (user_id, day)
);
ALTER TABLE public.active_days ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.active_days FROM anon, authenticated;

-- Which ambassador brought in another ambassador.
ALTER TABLE public.ambassadors ADD COLUMN IF NOT EXISTS referred_by text;

CREATE OR REPLACE FUNCTION public.mark_active()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.active_days (user_id, day)
  SELECT auth.uid(), (now() AT TIME ZONE 'Europe/Amsterdam')::date WHERE auth.uid() IS NOT NULL
  ON CONFLICT DO NOTHING
$$;

-- Called once after signing up through an ambassador's link. Only for new accounts (max. 14 days old),
-- only once, never for your own link.
CREATE OR REPLACE FUNCTION public.claim_referral(_source text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE src text := lower(btrim(coalesce(_source, '')));
BEGIN
  IF auth.uid() IS NULL OR src !~ '^amb-[a-z0-9]{2,20}$' THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ambassadors WHERE 'amb-' || code = src AND user_id <> auth.uid()) THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND created_at > now() - interval '14 days') THEN RETURN false; END IF;
  INSERT INTO public.referrals (user_id, source) VALUES (auth.uid(), src) ON CONFLICT DO NOTHING;
  RETURN true;
END $$;

-- Sign-ups and downloads through a code: waitlist rows plus app accounts, without counting the same e-mail twice.
CREATE OR REPLACE FUNCTION public.amb_signups(_code text) RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (SELECT count(*) FROM public.waitlist w WHERE w.source = 'amb-' || _code)
       + (SELECT count(*) FROM public.referrals r JOIN auth.users u ON u.id = r.user_id
          WHERE r.source = 'amb-' || _code
            AND NOT EXISTS (SELECT 1 FROM public.waitlist w WHERE w.source = r.source AND lower(w.email) = lower(u.email)))
$$;

-- Accounts through a code that were active on at least 5 of their first 7 days.
CREATE OR REPLACE FUNCTION public.amb_active_week(_code text) RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*) FROM public.referrals r JOIN auth.users u ON u.id = r.user_id
  WHERE r.source = 'amb-' || _code
    AND (SELECT count(*) FROM public.active_days d
         WHERE d.user_id = r.user_id AND d.day >= (u.created_at AT TIME ZONE 'Europe/Amsterdam')::date
           AND d.day < (u.created_at AT TIME ZONE 'Europe/Amsterdam')::date + 7) >= 5
$$;

-- Ambassadors someone brought in who joined (agreed), and how many of them have their first sign-up.
CREATE OR REPLACE FUNCTION public.amb_recruits(_code text) RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*) FROM public.ambassadors b WHERE b.referred_by = _code AND b.agreed_at IS NOT NULL
$$;
CREATE OR REPLACE FUNCTION public.amb_recruits_started(_code text) RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*) FROM public.ambassadors b WHERE b.referred_by = _code AND b.agreed_at IS NOT NULL AND public.amb_signups(b.code) > 0
$$;

-- The one place where points are counted (same rules as totalPoints in src/lib/ambassador.ts).
CREATE OR REPLACE FUNCTION public.ambassador_points(_user uuid) RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 3 * public.amb_signups(a.code) + 2 * public.amb_active_week(a.code)
       + 3 * public.amb_recruits(a.code) + 2 * public.amb_recruits_started(a.code)
  FROM public.ambassadors a WHERE a.user_id = _user
$$;

CREATE OR REPLACE FUNCTION public.my_ambassador_stats()
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'code', a.code, 'active', a.active, 'agreed_at', a.agreed_at, 'since', a.created_at, 'hall_of_fame', a.hall_of_fame,
    'signups', public.amb_signups(a.code),
    'active_week', public.amb_active_week(a.code),
    'recruits', public.amb_recruits(a.code),
    'recruits_started', public.amb_recruits_started(a.code),
    'task_points', 0,
    'approved', (SELECT count(*) FROM public.ambassador_submissions s WHERE s.user_id = a.user_id AND s.status = 'goedgekeurd'),
    'pending', (SELECT count(*) FROM public.ambassador_submissions s WHERE s.user_id = a.user_id AND s.status = 'ingediend'))
  FROM public.ambassadors a WHERE a.user_id = auth.uid()
$$;

DROP FUNCTION IF EXISTS public.ambassador_overview();
CREATE FUNCTION public.ambassador_overview()
RETURNS TABLE (user_id uuid, username text, display_name text, code text, active boolean, agreed_at timestamptz,
               signups bigint, active_week bigint, recruits bigint, recruits_started bigint, referred_by text, pending bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Alleen voor beheerders.'; END IF;
  RETURN QUERY
  SELECT a.user_id, p.username, p.display_name, a.code, a.active, a.agreed_at,
         public.amb_signups(a.code), public.amb_active_week(a.code), public.amb_recruits(a.code), public.amb_recruits_started(a.code),
         a.referred_by,
         (SELECT count(*) FROM public.ambassador_submissions s WHERE s.user_id = a.user_id AND s.status = 'ingediend')
  FROM public.ambassadors a JOIN public.profiles p ON p.id = a.user_id
  ORDER BY a.created_at;
END $$;

-- Adding an ambassador now also notes who brought them in: given by the admin, or the link they signed up with.
DROP FUNCTION IF EXISTS public.add_ambassador(text);
CREATE OR REPLACE FUNCTION public.add_ambassador(_username text, _referred_by text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p record;
  base text;
  c text;
  n int := 1;
  ref text := nullif(lower(btrim(regexp_replace(coalesce(_referred_by, ''), '^amb-', ''))), '');
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Alleen voor beheerders.'; END IF;
  SELECT id, username, birthdate, is_parent, is_teacher INTO p FROM public.profiles
   WHERE lower(username) = lower(btrim(ltrim(coalesce(_username, ''), '@')));
  IF NOT FOUND THEN RAISE EXCEPTION 'Geen lid gevonden met deze gebruikersnaam.'; END IF;
  IF coalesce(p.is_parent, false) OR coalesce(p.is_teacher, false) THEN RAISE EXCEPTION 'Ouders en leraren kunnen geen ambassadeur worden.'; END IF;
  IF p.birthdate IS NULL OR date_part('year', age(p.birthdate)) < 18 THEN
    RAISE EXCEPTION 'Ambassadeurs zijn 18 jaar of ouder.';
  END IF;
  IF ref IS NULL THEN SELECT substr(r.source, 5) INTO ref FROM public.referrals r WHERE r.user_id = p.id; END IF;
  IF ref IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.ambassadors WHERE code = ref AND user_id <> p.id) THEN
    RAISE EXCEPTION 'Geen ambassadeur gevonden met code %.', ref;
  END IF;
  SELECT code INTO c FROM public.ambassadors WHERE user_id = p.id;
  IF c IS NOT NULL THEN
    UPDATE public.ambassadors SET active = true, referred_by = coalesce(referred_by, ref) WHERE user_id = p.id;
    RETURN c;
  END IF;
  base := left(regexp_replace(lower(coalesce(p.username, 'ambassadeur')), '[^a-z0-9]', '', 'g'), 16);
  IF char_length(base) < 2 THEN base := 'amb'; END IF;
  c := base;
  WHILE EXISTS (SELECT 1 FROM public.ambassadors WHERE code = c) LOOP
    n := n + 1; c := base || n;
  END LOOP;
  INSERT INTO public.ambassadors (user_id, code, added_by, referred_by) VALUES (p.id, c, auth.uid(), ref);
  RETURN c;
END $$;

REVOKE ALL ON FUNCTION public.amb_signups(text), public.amb_active_week(text), public.amb_recruits(text),
  public.amb_recruits_started(text), public.ambassador_points(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_active(), public.claim_referral(text), public.my_ambassador_stats(),
  public.ambassador_overview(), public.add_ambassador(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_active(), public.claim_referral(text), public.my_ambassador_stats(),
  public.ambassador_overview(), public.add_ambassador(text, text) TO authenticated;
