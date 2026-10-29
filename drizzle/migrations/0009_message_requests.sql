ALTER TABLE public.conversations ADD COLUMN status text NOT NULL DEFAULT 'pending';
UPDATE public.conversations SET status = 'accepted';
ALTER TABLE public.conversations ADD CONSTRAINT conversations_status_check CHECK (status IN ('pending','accepted','declined'));
CREATE POLICY "respond to request" ON public.conversations FOR UPDATE TO authenticated
  USING ((auth.uid() = user_a OR auth.uid() = user_b) AND status = 'pending')
  WITH CHECK (status IN ('accepted','declined'));
DROP POLICY "send messages" ON public.direct_messages;
CREATE POLICY "send messages" ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND can_message(conv_other(conversation_id))
    AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.status = 'accepted'));