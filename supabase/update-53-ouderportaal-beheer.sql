BEGIN;

CREATE OR REPLACE FUNCTION public.parent_portal_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  today date := (now() AT TIME ZONE 'Europe/Amsterdam')::date;
  guides jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Alleen voor beheerders'; END IF;
  IF to_regclass('public.guide_progress') IS NOT NULL THEN
    EXECUTE $q$
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'guide', guide, 'started', started, 'completed', completed,
        'goed', goed, 'lastig', lastig, 'niet', niet) ORDER BY started DESC), '[]'::jsonb)
      FROM (
        SELECT guide,
          count(*) AS started,
          count(*) FILTER (WHERE completed_at IS NOT NULL) AS completed,
          count(*) FILTER (WHERE to_jsonb(g) ->> 'reflection' = 'goed') AS goed,
          count(*) FILTER (WHERE to_jsonb(g) ->> 'reflection' = 'lastig') AS lastig,
          count(*) FILTER (WHERE to_jsonb(g) ->> 'reflection' = 'niet') AS niet
        FROM public.guide_progress g
        WHERE NOT public.has_role(g.user_id, 'admin'::app_role)
        GROUP BY guide
      ) s
    $q$ INTO guides;
  END IF;
  RETURN jsonb_build_object(
    'parents', (SELECT count(*) FROM public.profiles WHERE is_parent),
    'parents_new_7_days', (SELECT count(*) FROM public.profiles p JOIN auth.users u ON u.id = p.id
                           WHERE p.is_parent AND u.created_at > now() - interval '7 days'),
    'young_parents', (SELECT count(*) FROM public.profiles WHERE also_parent AND NOT is_parent),
    'active_7_days', (SELECT count(DISTINCT user_id) FROM public.parent_checks WHERE day > today - 7 AND NOT public.has_role(user_id, 'admin'::app_role)),
    'tasks_7_days', jsonb_build_object(
      'zelf', (SELECT count(*) FROM public.parent_checks WHERE day > today - 7 AND kind = 'zelf' AND NOT public.has_role(user_id, 'admin'::app_role)),
      'kind', (SELECT count(*) FROM public.parent_checks WHERE day > today - 7 AND kind = 'kind' AND NOT public.has_role(user_id, 'admin'::app_role))),
    'tasks_per_day', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('day', d, 'count', c) ORDER BY d)
      FROM (SELECT day AS d, count(*) AS c FROM public.parent_checks WHERE day > today - 14 AND NOT public.has_role(user_id, 'admin'::app_role) GROUP BY day) x), '[]'::jsonb),
    'guides', guides
  );
END $$;
REVOKE ALL ON FUNCTION public.parent_portal_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.parent_portal_stats() TO authenticated;

COMMIT;
