BEGIN;

ALTER TABLE public.guide_progress ADD COLUMN IF NOT EXISTS reflection text;
ALTER TABLE public.guide_progress ADD COLUMN IF NOT EXISTS reflected_at timestamptz;
ALTER TABLE public.guide_progress DROP CONSTRAINT IF EXISTS guide_progress_reflection_check;
ALTER TABLE public.guide_progress ADD CONSTRAINT guide_progress_reflection_check
  CHECK (reflection IS NULL OR reflection IN ('goed', 'lastig', 'niet'));

COMMIT;
