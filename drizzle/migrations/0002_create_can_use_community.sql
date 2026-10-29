CREATE OR REPLACE FUNCTION public.can_use_community()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT public.has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.birthdate IS NOT NULL
      AND date_part('year', age(p.birthdate)) <= 25
  )
$function$;

-- Community (groepen, berichten, reacties) alleen voor leden tot 25 jaar; admins gezien uitzondering via has_role in can_access_group.
CREATE OR REPLACE FUNCTION public.can_access_group(_group uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT public.has_role(auth.uid(),'admin') OR (
    public.can_use_community() AND EXISTS (
      SELECT 1 FROM public.groups g WHERE g.id = _group AND NOT g.is_archived AND g.age_group = public.my_age_group())
  )
$function$;

DROP POLICY IF EXISTS "see own age groups" ON public.groups;
CREATE POLICY "see own age groups"
  ON public.groups
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (NOT is_archived AND age_group = public.my_age_group() AND public.can_use_community())
  );
