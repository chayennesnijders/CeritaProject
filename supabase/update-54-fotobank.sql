BEGIN;

CREATE TABLE IF NOT EXISTS public.story_photos (
  path text PRIMARY KEY CHECK (length(path) <= 300),
  hash text CHECK (hash IS NULL OR hash ~ '^[0-9a-f]{16}$'),
  hidden boolean NOT NULL DEFAULT false,
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.story_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "beheerders beheren de fotobank" ON public.story_photos;
CREATE POLICY "beheerders beheren de fotobank" ON public.story_photos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
REVOKE ALL ON public.story_photos FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_photos TO authenticated;

COMMIT;
