BEGIN;

ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT 'eigen';
ALTER TABLE public.companions ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT 'eigen';
ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS pets_color_check;
ALTER TABLE public.pets ADD CONSTRAINT pets_color_check CHECK (char_length(color) BETWEEN 1 AND 20);
ALTER TABLE public.companions DROP CONSTRAINT IF EXISTS companions_color_check;
ALTER TABLE public.companions ADD CONSTRAINT companions_color_check CHECK (char_length(color) BETWEEN 1 AND 20);

COMMIT;
