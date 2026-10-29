-- Ontdekken: supportive reactions (counts only, never who), saved stories and read marks.
-- Members can only react to / save / mark stories they are allowed to see (articles RLS, incl. 16+).
CREATE TABLE IF NOT EXISTS public.article_reactions (
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('herkenbaar', 'knuffel', 'sterk')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (article_id, user_id, kind)
);
CREATE TABLE IF NOT EXISTS public.article_saves (
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (article_id, user_id)
);
CREATE TABLE IF NOT EXISTS public.article_reads (
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (article_id, user_id)
);
--> statement-breakpoint
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['article_reactions', 'article_saves', 'article_reads'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "own rows read" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "own rows add" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "own rows remove" ON public.%I', t);
    EXECUTE format('CREATE POLICY "own rows read" ON public.%I FOR SELECT TO authenticated USING (user_id = auth.uid())', t);
    -- The EXISTS runs with the member's own rights, so it only finds stories they may read.
    EXECUTE format('CREATE POLICY "own rows add" ON public.%I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.articles a WHERE a.id = article_id))', t);
    EXECUTE format('CREATE POLICY "own rows remove" ON public.%I FOR DELETE TO authenticated USING (user_id = auth.uid())', t);
  END LOOP;
END $$;
--> statement-breakpoint
-- Reaction counts for the stories the caller may see.
CREATE OR REPLACE FUNCTION public.article_reaction_counts()
RETURNS TABLE (article_id uuid, herkenbaar bigint, knuffel bigint, sterk bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id,
         count(*) FILTER (WHERE r.kind = 'herkenbaar'),
         count(*) FILTER (WHERE r.kind = 'knuffel'),
         count(*) FILTER (WHERE r.kind = 'sterk')
  FROM public.articles a
  JOIN public.article_reactions r ON r.article_id = a.id
  WHERE (a.is_published AND coalesce(public.my_age(), 12) >= a.min_age) OR public.has_role(auth.uid(), 'admin')
  GROUP BY a.id
$$;
REVOKE ALL ON FUNCTION public.article_reaction_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.article_reaction_counts() TO authenticated;
