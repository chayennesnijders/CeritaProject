-- Photos (camera or gallery) and files in private chats and groups.
-- Same model as voice memos: private bucket, path "<sender>/<dm|group>/<conversation|group>/<file>",
-- uploads only where you may post, reading only for messages you can see.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('chat-files', 'chat-files', false, 20971520, ARRAY[
    'image/*', 'video/mp4', 'video/quicktime', 'video/webm', 'application/pdf', 'text/plain',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ])
ON CONFLICT (id) DO UPDATE SET file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
--> statement-breakpoint
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS attachment_path text, ADD COLUMN IF NOT EXISTS attachment_name text, ADD COLUMN IF NOT EXISTS attachment_type text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS attachment_path text, ADD COLUMN IF NOT EXISTS attachment_name text, ADD COLUMN IF NOT EXISTS attachment_type text;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.validate_chat_attachment() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE expected text;
BEGIN
  IF TG_TABLE_NAME = 'direct_messages' THEN expected := NEW.sender_id::text || '/dm/' || NEW.conversation_id::text || '/';
  ELSE expected := NEW.author_id::text || '/group/' || NEW.group_id::text || '/'; END IF;
  IF NEW.attachment_path IS NOT NULL AND (left(NEW.attachment_path, length(expected)) <> expected OR NEW.attachment_path LIKE '%..%') THEN
    RAISE EXCEPTION 'Ongeldige bijlage';
  END IF;
  IF NEW.attachment_name IS NOT NULL AND length(NEW.attachment_name) > 200 THEN RAISE EXCEPTION 'Bestandsnaam is te lang'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_dm_attachment ON public.direct_messages;
CREATE TRIGGER validate_dm_attachment BEFORE INSERT OR UPDATE ON public.direct_messages FOR EACH ROW EXECUTE FUNCTION public.validate_chat_attachment();
DROP TRIGGER IF EXISTS validate_group_attachment ON public.posts;
CREATE TRIGGER validate_group_attachment BEFORE INSERT OR UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.validate_chat_attachment();
--> statement-breakpoint
DROP POLICY IF EXISTS "upload own chat files" ON storage.objects;
DROP POLICY IF EXISTS "read accessible chat files" ON storage.objects;
DROP POLICY IF EXISTS "remove own chat files" ON storage.objects;
CREATE POLICY "upload own chat files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='chat-files' AND (storage.foldername(name))[1]=auth.uid()::text AND (((storage.foldername(name))[2]='dm' AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id::text=(storage.foldername(name))[3] AND auth.uid() IN (c.user_a,c.user_b) AND c.status='accepted' AND public.can_message(public.conv_other(c.id)))) OR ((storage.foldername(name))[2]='group' AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id::text=(storage.foldername(name))[3] AND public.is_member(g.id) AND public.can_access_group(g.id) AND NOT public.is_timed_out(auth.uid())))));
CREATE POLICY "read accessible chat files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='chat-files' AND ((storage.foldername(name))[1]=auth.uid()::text OR EXISTS (SELECT 1 FROM public.direct_messages m WHERE m.attachment_path=name) OR EXISTS (SELECT 1 FROM public.posts p WHERE p.attachment_path=name AND NOT p.is_hidden)));
CREATE POLICY "remove own chat files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='chat-files' AND (storage.foldername(name))[1]=auth.uid()::text);
