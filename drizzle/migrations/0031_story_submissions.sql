CREATE TABLE public.story_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  body text NOT NULL CHECK (char_length(body) BETWEEN 20 AND 20000),
  category text NOT NULL DEFAULT 'inspiratie',
  status text NOT NULL DEFAULT 'nieuw' CHECK (status IN ('nieuw','in_behandeling','geplaatst','afgewezen')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.story_submissions TO authenticated;
GRANT ALL ON public.story_submissions TO service_role;
ALTER TABLE public.story_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leden sturen eigen verhaal in" ON public.story_submissions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "leden zien eigen inzendingen" ON public.story_submissions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins werken status bij" ON public.story_submissions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));