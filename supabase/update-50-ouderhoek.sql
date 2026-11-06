BEGIN;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS also_parent boolean NOT NULL DEFAULT false;

COMMIT;
