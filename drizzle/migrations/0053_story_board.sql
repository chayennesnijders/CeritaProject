-- Story board: admins plan upcoming stories on a board (idee → schrijven → klaar → gepland → verschenen).
-- Members see the "gepland" ones (and ones that appeared in the last 14 days) and vote with a heart.
CREATE TABLE IF NOT EXISTS public.story_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 120),
  teaser text CHECK (char_length(teaser) <= 300),
  emoji text NOT NULL DEFAULT '📖',
  category text NOT NULL DEFAULT 'inspiratie',
  status text NOT NULL DEFAULT 'idee' CHECK (status IN ('idee', 'schrijven', 'klaar', 'gepland', 'verschenen')),
  planned_date date,
  sort double precision NOT NULL DEFAULT extract(epoch FROM now()),
  article_id uuid REFERENCES public.articles(id) ON DELETE SET NULL,
  published_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_plans TO authenticated;
GRANT ALL ON public.story_plans TO service_role;
ALTER TABLE public.story_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin story plans" ON public.story_plans;
CREATE POLICY "admin story plans" ON public.story_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.story_plans_touch() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status = 'verschenen' AND OLD.status IS DISTINCT FROM 'verschenen' THEN NEW.published_at := now(); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS story_plans_touch ON public.story_plans;
CREATE TRIGGER story_plans_touch BEFORE UPDATE ON public.story_plans FOR EACH ROW EXECUTE FUNCTION public.story_plans_touch();
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.story_votes (
  plan_id uuid NOT NULL REFERENCES public.story_plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.story_votes TO authenticated;
GRANT ALL ON public.story_votes TO service_role;
ALTER TABLE public.story_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own story votes read" ON public.story_votes;
DROP POLICY IF EXISTS "vote on planned stories" ON public.story_votes;
DROP POLICY IF EXISTS "remove own story vote" ON public.story_votes;
-- Members can't read story_plans directly (RLS), so the vote policy asks this helper.
CREATE OR REPLACE FUNCTION public.story_is_planned(_plan uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.story_plans WHERE id = _plan AND status = 'gepland')
$$;
CREATE POLICY "own story votes read" ON public.story_votes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "vote on planned stories" ON public.story_votes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.story_is_planned(plan_id));
CREATE POLICY "remove own story vote" ON public.story_votes FOR DELETE TO authenticated USING (user_id = auth.uid());
--> statement-breakpoint
-- What members see: planned stories and the ones that appeared in the last 14 days, with heart counts
-- (never who voted). Admins get every story with its count, for the planning board.
CREATE OR REPLACE FUNCTION public.story_board()
RETURNS TABLE (id uuid, title text, teaser text, emoji text, category text, status text, planned_date date,
               sort double precision, article_id uuid, published_at timestamptz, votes bigint, voted boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.title, p.teaser, p.emoji, p.category, p.status, p.planned_date, p.sort, p.article_id, p.published_at,
         (SELECT count(*) FROM public.story_votes v WHERE v.plan_id = p.id),
         EXISTS (SELECT 1 FROM public.story_votes v WHERE v.plan_id = p.id AND v.user_id = auth.uid())
  FROM public.story_plans p
  WHERE public.has_role(auth.uid(), 'admin')
     OR p.status = 'gepland'
     OR (p.status = 'verschenen' AND p.published_at > now() - interval '14 days')
  ORDER BY p.planned_date NULLS LAST, p.sort
$$;
REVOKE ALL ON FUNCTION public.story_board() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.story_board() TO authenticated;
