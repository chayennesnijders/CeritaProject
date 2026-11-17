-- Update na update-71: 1 punt per voltooide challenge (opdracht), als een beheerder de inzending goedkeurt.
-- Elke challenge telt één keer per ambassadeur. Eigen losse posts (zonder challenge) geven geen punten.
-- Plak dit in Supabase → SQL Editor en klik Run. Je kunt het veilig vaker draaien.

CREATE OR REPLACE FUNCTION public.amb_tasks_done(_user uuid) RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(DISTINCT s.task_id) FROM public.ambassador_submissions s
  WHERE s.user_id = _user AND s.task_id IS NOT NULL AND s.status = 'goedgekeurd'
$$;

-- Points in one place (same rules as POINTS/totalPoints in src/lib/ambassador.ts).
CREATE OR REPLACE FUNCTION public.ambassador_points(_user uuid) RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 3 * public.amb_signups(a.code) + 2 * public.amb_active_week(a.code)
       + 3 * public.amb_recruits(a.code) + 2 * public.amb_recruits_started(a.code)
       + 1 * public.amb_tasks_done(a.user_id)
  FROM public.ambassadors a WHERE a.user_id = _user
$$;

-- An approved challenge shows 1 point; own posts 0.
CREATE OR REPLACE FUNCTION public.review_submission(_id uuid, _ok boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Alleen voor beheerders.'; END IF;
  UPDATE public.ambassador_submissions s
     SET status = CASE WHEN _ok THEN 'goedgekeurd' ELSE 'afgewezen' END,
         points = CASE WHEN _ok AND s.task_id IS NOT NULL THEN 1 ELSE 0 END,
         reviewed_at = now()
   WHERE s.id = _id;
END $$;

CREATE OR REPLACE FUNCTION public.my_ambassador_stats()
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'code', a.code, 'active', a.active, 'agreed_at', a.agreed_at, 'since', a.created_at, 'hall_of_fame', a.hall_of_fame,
    'signups', public.amb_signups(a.code),
    'active_week', public.amb_active_week(a.code),
    'recruits', public.amb_recruits(a.code),
    'recruits_started', public.amb_recruits_started(a.code),
    'tasks_done', public.amb_tasks_done(a.user_id),
    'task_points', 0,
    'approved', (SELECT count(*) FROM public.ambassador_submissions s WHERE s.user_id = a.user_id AND s.status = 'goedgekeurd'),
    'pending', (SELECT count(*) FROM public.ambassador_submissions s WHERE s.user_id = a.user_id AND s.status = 'ingediend'))
  FROM public.ambassadors a WHERE a.user_id = auth.uid()
$$;

DROP FUNCTION IF EXISTS public.ambassador_overview();
CREATE FUNCTION public.ambassador_overview()
RETURNS TABLE (user_id uuid, username text, display_name text, code text, active boolean, agreed_at timestamptz,
               signups bigint, active_week bigint, recruits bigint, recruits_started bigint, tasks_done bigint, referred_by text, pending bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Alleen voor beheerders.'; END IF;
  RETURN QUERY
  SELECT a.user_id, p.username, p.display_name, a.code, a.active, a.agreed_at,
         public.amb_signups(a.code), public.amb_active_week(a.code), public.amb_recruits(a.code), public.amb_recruits_started(a.code),
         public.amb_tasks_done(a.user_id), a.referred_by,
         (SELECT count(*) FROM public.ambassador_submissions s WHERE s.user_id = a.user_id AND s.status = 'ingediend')
  FROM public.ambassadors a JOIN public.profiles p ON p.id = a.user_id
  ORDER BY a.created_at;
END $$;

REVOKE ALL ON FUNCTION public.amb_tasks_done(uuid), public.ambassador_points(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.review_submission(uuid, boolean), public.my_ambassador_stats(), public.ambassador_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_submission(uuid, boolean), public.my_ambassador_stats(), public.ambassador_overview() TO authenticated;

-- For the readiness check in Beheer → Livegang.
CREATE OR REPLACE FUNCTION public.points_per_challenge() RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT 1 $$;
GRANT EXECUTE ON FUNCTION public.points_per_challenge() TO authenticated;
