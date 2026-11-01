-- Update na update-34: wekelijkse check-in in groepen ('Hoe gaat het deze week met je?').
-- Plak dit in Supabase → SQL Editor → New query → Run. Per ongeluk twee keer gedaan? Geen probleem.
BEGIN;

-- ===== 0084_group_checkins =====
-- Weekly check-in in every group ("Hoe gaat het deze week met je?"): members tap how they feel.
-- Everyone sees only the totals per feeling (never who), so you see you're not the only one.
CREATE TABLE IF NOT EXISTS public.group_checkins (
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week date NOT NULL,
  mood text NOT NULL CHECK (mood IN ('super', 'goed', 'gaat-wel', 'verdrietig', 'gestrest')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id, week)
);
ALTER TABLE public.group_checkins ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_checkins TO authenticated;
GRANT ALL ON public.group_checkins TO service_role;
DROP POLICY IF EXISTS "own checkin read" ON public.group_checkins;
CREATE POLICY "own checkin read" ON public.group_checkins FOR SELECT TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "own checkin write" ON public.group_checkins;
CREATE POLICY "own checkin write" ON public.group_checkins FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_member(group_id) AND public.can_access_group(group_id));
DROP POLICY IF EXISTS "own checkin change" ON public.group_checkins;
CREATE POLICY "own checkin change" ON public.group_checkins FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND public.is_member(group_id));
DROP POLICY IF EXISTS "own checkin remove" ON public.group_checkins;
CREATE POLICY "own checkin remove" ON public.group_checkins FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Totals per feeling for this week in a group, for people who may see the group. Never names.
CREATE OR REPLACE FUNCTION public.group_checkin_totals(_group uuid, _week date)
RETURNS TABLE (mood text, total integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.mood, count(*)::int FROM public.group_checkins c
  WHERE c.group_id = _group AND c.week = _week AND public.can_access_group(_group)
  GROUP BY c.mood
$$;
REVOKE ALL ON FUNCTION public.group_checkin_totals(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.group_checkin_totals(uuid, date) TO authenticated;

COMMIT;
