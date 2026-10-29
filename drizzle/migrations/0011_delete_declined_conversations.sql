CREATE POLICY "delete pending conversation" ON public.conversations FOR DELETE TO authenticated
  USING ((auth.uid() = user_a OR auth.uid() = user_b) AND status <> 'accepted');