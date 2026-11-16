-- Update na update-67: ambassadeurs kunnen bij een opdracht ook een foto insturen (bijv. 'poster opgehangen')
-- in plaats van een link. De foto's staan in een privé map: alleen de ambassadeur zelf en beheerders zien ze.
-- Plak dit in Supabase → SQL Editor en klik Run. Je kunt het veilig vaker draaien.

ALTER TABLE public.ambassador_submissions ADD COLUMN IF NOT EXISTS photo_path text;
ALTER TABLE public.ambassador_submissions ALTER COLUMN url DROP NOT NULL;
ALTER TABLE public.ambassador_submissions DROP CONSTRAINT IF EXISTS ambassador_submissions_url_check;
ALTER TABLE public.ambassador_submissions DROP CONSTRAINT IF EXISTS ambassador_submissions_link_or_photo;
ALTER TABLE public.ambassador_submissions ADD CONSTRAINT ambassador_submissions_link_or_photo CHECK (
  (url IS NULL OR (url ~ '^https://' AND char_length(url) <= 300))
  AND (photo_path IS NULL OR (photo_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png)$'))
  AND (url IS NOT NULL OR photo_path IS NOT NULL));

-- A photo must sit in the sender's own folder.
DROP POLICY IF EXISTS "ambassadeurs dienen in" ON public.ambassador_submissions;
CREATE POLICY "ambassadeurs dienen in" ON public.ambassador_submissions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'ingediend' AND points = 0 AND reviewed_at IS NULL
              AND public.is_ambassador(auth.uid())
              AND (photo_path IS NULL OR split_part(photo_path, '/', 1) = auth.uid()::text));

INSERT INTO storage.buckets (id, name, public) VALUES ('ambassador-photos', 'ambassador-photos', false) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "ambassadeur uploadt eigen foto" ON storage.objects;
CREATE POLICY "ambassadeur uploadt eigen foto" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ambassador-photos' AND (storage.foldername(name))[1] = auth.uid()::text
              AND public.is_ambassador(auth.uid()));
DROP POLICY IF EXISTS "ambassadeursfoto bekijken" ON storage.objects;
CREATE POLICY "ambassadeursfoto bekijken" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ambassador-photos' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
DROP POLICY IF EXISTS "ambassadeursfoto verwijderen" ON storage.objects;
CREATE POLICY "ambassadeursfoto verwijderen" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ambassador-photos' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));

-- For the readiness check in Beheer → Livegang.
CREATE OR REPLACE FUNCTION public.ambassador_photos_ready() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'ambassador_submissions' AND column_name = 'photo_path')
$$;
REVOKE ALL ON FUNCTION public.ambassador_photos_ready() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ambassador_photos_ready() TO authenticated;
