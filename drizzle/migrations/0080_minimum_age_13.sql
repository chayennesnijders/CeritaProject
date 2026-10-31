-- ===== 0080_minimum_age_13 =====
-- CeritaProject is now for young people from 13 (not 12) to 27. The youngest group is 13–15.
-- Only the community and chat checks change; the age groups themselves stay the same.

CREATE OR REPLACE FUNCTION public.can_use_community()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.birthdate IS NOT NULL
      AND date_part('year', age(p.birthdate)) BETWEEN 13 AND 27)
$$;

CREATE OR REPLACE FUNCTION public.can_message(_other uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _other <> auth.uid()
    AND NOT EXISTS (SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = _other)
         OR (b.blocker_id = _other AND b.blocked_id = auth.uid()))
    AND (
      -- Members of the same age band.
      (public.can_use_community() AND EXISTS (SELECT 1 FROM public.profiles me, public.profiles o
        WHERE me.id = auth.uid() AND o.id = _other
          AND me.birthdate IS NOT NULL AND o.birthdate IS NOT NULL
          AND date_part('year', age(o.birthdate)) BETWEEN 13 AND 27
          AND me.age_group = o.age_group
          AND o.allow_messages))
      -- A member and a coach, in both directions.
      OR (public.can_use_community() AND public.is_coach(_other))
      OR (public.is_coach(auth.uid()) AND EXISTS (SELECT 1 FROM public.profiles o
        WHERE o.id = _other AND o.birthdate IS NOT NULL
          AND date_part('year', age(o.birthdate)) BETWEEN 13 AND 27 AND o.allow_messages))
    )
$$;
