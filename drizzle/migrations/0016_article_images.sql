ALTER TABLE public.articles ADD COLUMN image_url text;

CREATE POLICY "leden lezen artikelfotos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'article-images');
CREATE POLICY "admins uploaden artikelfotos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'article-images' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins verwijderen artikelfotos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'article-images' AND public.has_role(auth.uid(), 'admin'::app_role));