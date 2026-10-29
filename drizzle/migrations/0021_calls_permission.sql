ALTER TABLE public.profiles ADD COLUMN allow_calls boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.can_call(_conv uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.profiles a ON a.id = c.user_a
    JOIN public.profiles b ON b.id = c.user_b
    WHERE c.id = _conv AND c.status = 'accepted'
      AND auth.uid() IN (c.user_a, c.user_b)
      AND a.allow_calls AND b.allow_calls
      AND public.can_message(CASE WHEN c.user_a = auth.uid() THEN c.user_b ELSE c.user_a END))
$$;
GRANT EXECUTE ON FUNCTION public.can_call(uuid) TO authenticated;