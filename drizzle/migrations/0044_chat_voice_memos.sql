ALTER TABLE public.direct_messages ADD COLUMN audio_path text;
ALTER TABLE public.posts ADD COLUMN audio_path text;
CREATE OR REPLACE FUNCTION public.validate_chat_audio() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE expected text;
BEGIN
IF TG_TABLE_NAME='direct_messages' THEN expected:=NEW.sender_id::text||'/dm/'||NEW.conversation_id::text||'/'; ELSE expected:=NEW.author_id::text||'/group/'||NEW.group_id::text||'/'; END IF;
IF NEW.audio_path IS NOT NULL AND (left(NEW.audio_path,length(expected))<>expected OR NEW.audio_path LIKE '%..%' OR NEW.audio_path NOT LIKE '%.wav') THEN RAISE EXCEPTION 'Ongeldige spraakmemo'; END IF;
RETURN NEW;
END $$;
CREATE TRIGGER validate_dm_audio BEFORE INSERT OR UPDATE ON public.direct_messages FOR EACH ROW EXECUTE FUNCTION public.validate_chat_audio();
CREATE TRIGGER validate_group_audio BEFORE INSERT OR UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.validate_chat_audio();
CREATE POLICY "upload own chat audio" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='chat-audio' AND (storage.foldername(name))[1]=auth.uid()::text AND (((storage.foldername(name))[2]='dm' AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id::text=(storage.foldername(name))[3] AND auth.uid() IN(c.user_a,c.user_b) AND c.status='accepted' AND public.can_message(public.conv_other(c.id)))) OR ((storage.foldername(name))[2]='group' AND EXISTS(SELECT 1 FROM public.groups g WHERE g.id::text=(storage.foldername(name))[3] AND public.is_member(g.id) AND public.can_access_group(g.id) AND NOT public.is_timed_out(auth.uid())))));
CREATE POLICY "read accessible chat audio" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='chat-audio' AND ((storage.foldername(name))[1]=auth.uid()::text OR EXISTS(SELECT 1 FROM public.direct_messages m WHERE m.audio_path=name) OR EXISTS(SELECT 1 FROM public.posts p WHERE p.audio_path=name AND NOT p.is_hidden)));
CREATE POLICY "remove own chat audio" ON storage.objects FOR DELETE TO authenticated USING(bucket_id='chat-audio' AND (storage.foldername(name))[1]=auth.uid()::text);