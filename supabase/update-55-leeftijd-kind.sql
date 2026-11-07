BEGIN;

CREATE TABLE IF NOT EXISTS public.parent_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  child_ages text[] NOT NULL DEFAULT '{}'
    CHECK (child_ages <@ ARRAY['0-3','4-9','10-12','13-15','16-18','19+']::text[] AND cardinality(child_ages) <= 6),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.parent_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "eigen ouder-instellingen" ON public.parent_settings;
CREATE POLICY "eigen ouder-instellingen" ON public.parent_settings FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
REVOKE ALL ON public.parent_settings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_settings TO authenticated;

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
    'guides', guides,
    'child_ages', CASE WHEN to_regclass('public.parent_settings') IS NULL THEN '{}'::jsonb ELSE (
      SELECT COALESCE(jsonb_object_agg(band, n), '{}'::jsonb) FROM (
        SELECT band, count(*) AS n FROM public.parent_settings s, unnest(s.child_ages) AS band
        WHERE NOT public.has_role(s.user_id, 'admin'::app_role) GROUP BY band) x) END
  );
END $$;
REVOKE ALL ON FUNCTION public.parent_portal_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.parent_portal_stats() TO authenticated;

COMMIT;
