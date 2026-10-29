CREATE OR REPLACE FUNCTION public.dm_other_read_at(_conv uuid)
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.last_read_at
  FROM public.conversations c
  JOIN public.conversation_prefs p
    ON p.conversation_id = c.id
   AND p.user_id = CASE WHEN c.user_a = auth.uid() THEN c.user_b ELSE c.user_a END
  WHERE c.id = _conv
    AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.dm_other_read_at(uuid) TO authenticated;