-- Luisteren & kijken: podcasts, interviews and other recordings. Admins upload and schedule them;
-- members see an item from its publish moment, with the same 12+/16+ rule as stories.
CREATE TABLE IF NOT EXISTS public.media_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'podcast' CHECK (kind IN ('podcast', 'interview', 'video')),
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 2 AND 140),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 4000),
  media_path text NOT NULL,
  media_type text NOT NULL DEFAULT 'audio' CHECK (media_type IN ('audio', 'video')),
  cover_path text,
  duration_seconds integer CHECK (duration_seconds >= 0),
  min_age integer NOT NULL DEFAULT 12 CHECK (min_age IN (12, 16)),
  publish_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS media_items_publish_idx ON public.media_items (publish_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_items TO authenticated;
GRANT ALL ON public.media_items TO service_role;
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read published media" ON public.media_items;
CREATE POLICY "read published media" ON public.media_items FOR SELECT TO authenticated
  USING ((publish_at <= now() AND coalesce(public.my_age(), 12) >= min_age) OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins manage media" ON public.media_items;
CREATE POLICY "admins manage media" ON public.media_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
--> statement-breakpoint
-- Recordings and covers live in a private bucket; a file can be opened only when its item is visible to you.
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', false) ON CONFLICT (id) DO NOTHING;
CREATE OR REPLACE FUNCTION public.can_open_media(_path text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR EXISTS (
    SELECT 1 FROM public.media_items m
    WHERE (m.media_path = _path OR m.cover_path = _path)
      AND m.publish_at <= now() AND coalesce(public.my_age(), 12) >= m.min_age
  )
$$;
REVOKE ALL ON FUNCTION public.can_open_media(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_open_media(text) TO authenticated;
DROP POLICY IF EXISTS "open visible media" ON storage.objects;
DROP POLICY IF EXISTS "admins upload media" ON storage.objects;
DROP POLICY IF EXISTS "admins delete media" ON storage.objects;
CREATE POLICY "open visible media" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'media' AND public.can_open_media(name));
CREATE POLICY "admins upload media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));
