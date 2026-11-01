-- Update na update-35: verhalen inplannen (ze verschijnen pas op de gekozen datum).
-- Plak dit in Supabase → SQL Editor → New query → Run. Per ongeluk twee keer gedaan? Geen probleem.
BEGIN;

-- ===== 0085_scheduled_stories =====
-- Plan stories ahead: a story becomes visible to members from its publish_at moment.
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS publish_at timestamptz NOT NULL DEFAULT now();
DROP POLICY IF EXISTS "read articles" ON public.articles;
CREATE POLICY "read articles" ON public.articles FOR SELECT TO authenticated
  USING ((is_published AND publish_at <= now() AND COALESCE(public.my_age(), 12) >= min_age)
         OR public.has_role(auth.uid(), 'admin'));

COMMIT;
