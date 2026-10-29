CREATE POLICY "admin invite members" ON public.group_members FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(),'admin')
  AND EXISTS (
    SELECT 1 FROM public.groups g JOIN public.profiles p ON p.id = group_members.user_id
    WHERE g.id = group_members.group_id AND g.age_group = p.age_group AND NOT g.is_archived
  )
);
CREATE POLICY "admin see members" ON public.group_members FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;