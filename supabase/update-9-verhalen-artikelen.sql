-- Update na update-8: verhalen en artikelen apart in Ontdekken.
-- Plak dit in Supabase → SQL Editor → New query → Run. Per ongeluk twee keer gedaan? Geen probleem.

-- ===== 0058_article_kind =====
-- Ontdekken has two kinds: personal stories ("verhaal") and informative articles ("artikel").
-- Everything already there (incl. the WordPress stories) stays a story.
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'verhaal';
ALTER TABLE public.articles DROP CONSTRAINT IF EXISTS articles_kind_check;
ALTER TABLE public.articles ADD CONSTRAINT articles_kind_check CHECK (kind IN ('verhaal', 'artikel'));
