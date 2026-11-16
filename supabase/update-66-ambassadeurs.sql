-- Update na update-65: Cerita Ambassadors. Een beheerder maakt een lid van 18+ ambassadeur; die krijgt
-- een eigen link naar de wachtlijst (bron amb-<code>), opdrachten, punten en levels in het portaal /ambassadeur.
-- Punten: 1 per aanmelding via de eigen link + de punten van goedgekeurde inzendingen.
-- Plak dit in Supabase → SQL Editor en klik Run. Je kunt het veilig vaker draaien.

CREATE TABLE IF NOT EXISTS public.ambassadors (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9]{2,20}$'),
  active boolean NOT NULL DEFAULT true,
  agreed_at timestamptz,
  added_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ambassadors FROM anon;
GRANT SELECT ON public.ambassadors TO authenticated;
DROP POLICY IF EXISTS "eigen ambassadeursrij" ON public.ambassadors;
CREATE POLICY "eigen ambassadeursrij" ON public.ambassadors FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.is_ambassador(_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.ambassadors WHERE user_id = _user AND active)
$$;

CREATE TABLE IF NOT EXISTS public.ambassador_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 80),
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 600),
  points integer NOT NULL DEFAULT 2 CHECK (points BETWEEN 1 AND 20),
  active boolean NOT NULL DEFAULT true,
  due date,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ambassador_tasks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ambassador_tasks FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ambassador_tasks TO authenticated;
DROP POLICY IF EXISTS "ambassadeurs zien opdrachten" ON public.ambassador_tasks;
CREATE POLICY "ambassadeurs zien opdrachten" ON public.ambassador_tasks FOR SELECT TO authenticated
  USING ((active AND public.is_ambassador(auth.uid())) OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "beheerders beheren opdrachten" ON public.ambassador_tasks;
CREATE POLICY "beheerders beheren opdrachten" ON public.ambassador_tasks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.ambassador_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.ambassador_tasks(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  url text NOT NULL CHECK (url ~ '^https://' AND char_length(url) <= 300),
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 300),
  status text NOT NULL DEFAULT 'ingediend' CHECK (status IN ('ingediend', 'goedgekeurd', 'afgewezen')),
  points integer NOT NULL DEFAULT 0 CHECK (points BETWEEN 0 AND 20),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
CREATE INDEX IF NOT EXISTS ambassador_submissions_user ON public.ambassador_submissions (user_id, created_at DESC);
ALTER TABLE public.ambassador_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ambassador_submissions FROM anon;
GRANT SELECT, INSERT ON public.ambassador_submissions TO authenticated;
DROP POLICY IF EXISTS "eigen inzendingen lezen" ON public.ambassador_submissions;
CREATE POLICY "eigen inzendingen lezen" ON public.ambassador_submissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
-- A new submission always starts as 'ingediend' without points; only review_submission() changes that.
DROP POLICY IF EXISTS "ambassadeurs dienen in" ON public.ambassador_submissions;
CREATE POLICY "ambassadeurs dienen in" ON public.ambassador_submissions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'ingediend' AND points = 0 AND reviewed_at IS NULL AND public.is_ambassador(auth.uid()));

-- Make a member (18+) an ambassador, or switch an earlier one back on. Returns the link code.
CREATE OR REPLACE FUNCTION public.add_ambassador(_username text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p record;
  base text;
  c text;
  n int := 1;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Alleen voor beheerders.'; END IF;
  SELECT id, username, birthdate, is_parent, is_teacher INTO p FROM public.profiles
   WHERE lower(username) = lower(btrim(ltrim(coalesce(_username, ''), '@')));
  IF NOT FOUND THEN RAISE EXCEPTION 'Geen lid gevonden met deze gebruikersnaam.'; END IF;
  IF coalesce(p.is_parent, false) OR coalesce(p.is_teacher, false) THEN RAISE EXCEPTION 'Ouders en leraren kunnen geen ambassadeur worden.'; END IF;
  IF p.birthdate IS NULL OR date_part('year', age(p.birthdate)) < 18 THEN
    RAISE EXCEPTION 'Ambassadeurs zijn 18 jaar of ouder.';
  END IF;
  SELECT code INTO c FROM public.ambassadors WHERE user_id = p.id;
  IF c IS NOT NULL THEN
    UPDATE public.ambassadors SET active = true WHERE user_id = p.id;
    RETURN c;
  END IF;
  base := left(regexp_replace(lower(coalesce(p.username, 'ambassadeur')), '[^a-z0-9]', '', 'g'), 16);
  IF char_length(base) < 2 THEN base := 'amb'; END IF;
  c := base;
  WHILE EXISTS (SELECT 1 FROM public.ambassadors WHERE code = c) LOOP
    n := n + 1; c := base || n;
  END LOOP;
  INSERT INTO public.ambassadors (user_id, code, added_by) VALUES (p.id, c, auth.uid());
  RETURN c;
END $$;

CREATE OR REPLACE FUNCTION public.set_ambassador_active(_user uuid, _active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Alleen voor beheerders.'; END IF;
  UPDATE public.ambassadors SET active = _active WHERE user_id = _user;
END $$;

-- The ambassador agrees to the rules (#samenwerking, no DMs to recruit, no personal data of others).
CREATE OR REPLACE FUNCTION public.agree_ambassador_terms()
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t timestamptz;
BEGIN
  UPDATE public.ambassadors SET agreed_at = coalesce(agreed_at, now())
   WHERE user_id = auth.uid() AND active RETURNING agreed_at INTO t;
  IF t IS NULL THEN RAISE EXCEPTION 'Je bent (nog) geen ambassadeur.'; END IF;
  RETURN t;
END $$;

CREATE OR REPLACE FUNCTION public.review_submission(_id uuid, _ok boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Alleen voor beheerders.'; END IF;
  -- Own posts (no assignment) count at most twice per week.
  IF _ok AND EXISTS (
    SELECT 1 FROM public.ambassador_submissions s WHERE s.id = _id AND s.task_id IS NULL AND (
      SELECT count(*) FROM public.ambassador_submissions o
       WHERE o.user_id = s.user_id AND o.task_id IS NULL AND o.status = 'goedgekeurd' AND o.id <> s.id
         AND date_trunc('week', o.created_at) = date_trunc('week', s.created_at)) >= 2)
  THEN RAISE EXCEPTION 'Deze ambassadeur heeft die week al 2 eigen posts goedgekeurd gekregen.'; END IF;
  UPDATE public.ambassador_submissions s
     SET status = CASE WHEN _ok THEN 'goedgekeurd' ELSE 'afgewezen' END,
         points = CASE WHEN _ok THEN coalesce((SELECT t.points FROM public.ambassador_tasks t WHERE t.id = s.task_id), 2) ELSE 0 END,
         reviewed_at = now()
   WHERE s.id = _id;
END $$;

-- Your own numbers: only counts, never who signed up.
CREATE OR REPLACE FUNCTION public.my_ambassador_stats()
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'code', a.code, 'active', a.active, 'agreed_at', a.agreed_at, 'since', a.created_at,
    'signups', (SELECT count(*) FROM public.waitlist w WHERE w.source = 'amb-' || a.code),
    'task_points', (SELECT coalesce(sum(points), 0) FROM public.ambassador_submissions s WHERE s.user_id = a.user_id AND s.status = 'goedgekeurd'),
    'approved', (SELECT count(*) FROM public.ambassador_submissions s WHERE s.user_id = a.user_id AND s.status = 'goedgekeurd'),
    'pending', (SELECT count(*) FROM public.ambassador_submissions s WHERE s.user_id = a.user_id AND s.status = 'ingediend'))
  FROM public.ambassadors a WHERE a.user_id = auth.uid()
$$;

-- Beheer: every ambassador with their numbers.
CREATE OR REPLACE FUNCTION public.ambassador_overview()
RETURNS TABLE (user_id uuid, username text, display_name text, code text, active boolean, agreed_at timestamptz,
               signups bigint, task_points bigint, pending bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Alleen voor beheerders.'; END IF;
  RETURN QUERY
  SELECT a.user_id, p.username, p.display_name, a.code, a.active, a.agreed_at,
         (SELECT count(*) FROM public.waitlist w WHERE w.source = 'amb-' || a.code),
         (SELECT coalesce(sum(s.points), 0) FROM public.ambassador_submissions s WHERE s.user_id = a.user_id AND s.status = 'goedgekeurd'),
         (SELECT count(*) FROM public.ambassador_submissions s WHERE s.user_id = a.user_id AND s.status = 'ingediend')
  FROM public.ambassadors a JOIN public.profiles p ON p.id = a.user_id
  ORDER BY a.created_at;
END $$;

REVOKE ALL ON FUNCTION public.is_ambassador(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.add_ambassador(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_ambassador_active(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.agree_ambassador_terms() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_submission(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_ambassador_stats() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ambassador_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_ambassador(uuid), public.add_ambassador(text), public.set_ambassador_active(uuid, boolean),
  public.agree_ambassador_terms(), public.review_submission(uuid, boolean), public.my_ambassador_stats(),
  public.ambassador_overview() TO authenticated;
