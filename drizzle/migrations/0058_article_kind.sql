-- Ontdekken has two kinds: personal stories ("verhaal") and informative articles ("artikel").
-- Everything already there (incl. the WordPress stories) stays a story.
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'verhaal';
ALTER TABLE public.articles DROP CONSTRAINT IF EXISTS articles_kind_check;
ALTER TABLE public.articles ADD CONSTRAINT articles_kind_check CHECK (kind IN ('verhaal', 'artikel'));
