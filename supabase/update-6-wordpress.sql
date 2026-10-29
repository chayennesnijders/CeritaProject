-- Update na update-5: verhalen van WordPress kunnen ophalen.
-- Plak dit in Supabase → SQL Editor → New query → Run. Per ongeluk twee keer gedaan? Geen probleem.

-- ===== 0055_wordpress_import =====
-- Stories imported from the WordPress site keep their WordPress post id,
-- so importing again updates them instead of adding duplicates.
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS wp_id bigint;
CREATE UNIQUE INDEX IF NOT EXISTS articles_wp_id_key ON public.articles (wp_id);
COMMIT;
