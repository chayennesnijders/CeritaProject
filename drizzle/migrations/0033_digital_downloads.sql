CREATE POLICY "admins manage digital products" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'digital-products' AND public.has_role(auth.uid(),'admin'))
WITH CHECK (bucket_id = 'digital-products' AND public.has_role(auth.uid(),'admin'));
UPDATE public.shop_products SET description = 'Printbare journal met 14 dagpagina''s vol vragen om rust in je hoofd te krijgen. Na betaling download je meteen de pdf.' WHERE id = 'journal_rust';
UPDATE public.shop_products SET description = 'Printbare journal voor je dromen en doelen, met 8 weekpagina''s. Na betaling download je meteen de pdf.' WHERE id = 'journal_dromen';