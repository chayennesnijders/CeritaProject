-- Stories imported from the WordPress site keep their WordPress post id,
-- so importing again updates them instead of adding duplicates.
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS wp_id bigint;
CREATE UNIQUE INDEX IF NOT EXISTS articles_wp_id_key ON public.articles (wp_id);
