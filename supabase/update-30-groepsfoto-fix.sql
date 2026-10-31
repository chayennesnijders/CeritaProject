-- Update na update-29: foto's, bestanden en tekeningen sturen in groepen werkt weer.
-- Plak dit in Supabase → SQL Editor → New query → Run. Per ongeluk twee keer gedaan? Geen probleem.
-- (Heb je update-29 nog niet gedaan? Dan mag je deze ook los plakken, hij hangt er niet van af.)
BEGIN;

-- ===== 0079_fix_group_chat_files =====
-- Fix: photos, files and drawings could not be sent in groups ("new row violates row-level security
-- policy"). In the upload rule, "name" inside the groups subquery meant the group's name instead of
-- the file's path. Every column is now written out with its table, so the rule checks the file path.
DROP POLICY IF EXISTS "upload own chat files" ON storage.objects;
CREATE POLICY "upload own chat files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  objects.bucket_id = 'chat-files'
  AND (storage.foldername(objects.name))[1] = auth.uid()::text
  AND (
    ((storage.foldername(objects.name))[2] = 'dm' AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id::text = (storage.foldername(objects.name))[3]
        AND auth.uid() IN (c.user_a, c.user_b) AND c.status = 'accepted'
        AND public.can_message(public.conv_other(c.id))))
    OR
    ((storage.foldername(objects.name))[2] = 'group' AND EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id::text = (storage.foldername(objects.name))[3]
        AND public.is_member(g.id) AND public.can_access_group(g.id)
        AND NOT public.is_timed_out(auth.uid())))
  )
);

COMMIT;
