-- Members can always chat with a coach, whatever their age band (coaches are added by admins and
-- often have more experience, so they are older). Everything else still stays within one age band.
-- Also: "Mijn doelen" is taken out again (the pet's daily to-do list already does this).

CREATE OR REPLACE FUNCTION public.can_message(_other uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _other <> auth.uid()
    AND NOT EXISTS (SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = _other)
         OR (b.blocker_id = _other AND b.blocked_id = auth.uid()))
    AND (
      -- Members of the same age band, as before.
      (public.can_use_community() AND EXISTS (SELECT 1 FROM public.profiles me, public.profiles o
        WHERE me.id = auth.uid() AND o.id = _other
          AND me.birthdate IS NOT NULL AND o.birthdate IS NOT NULL
          AND date_part('year', age(o.birthdate)) BETWEEN 12 AND 27
          AND me.age_group = o.age_group
          AND o.allow_messages))
      -- A member and a coach, in both directions.
      OR (public.can_use_community() AND public.is_coach(_other))
      OR (public.is_coach(auth.uid()) AND EXISTS (SELECT 1 FROM public.profiles o
        WHERE o.id = _other AND o.birthdate IS NOT NULL
          AND date_part('year', age(o.birthdate)) BETWEEN 12 AND 27 AND o.allow_messages))
    )
$$;

-- Coaches can be older than 27, so they keep seeing their chats.
DROP POLICY IF EXISTS "see own conversations" ON public.conversations;
CREATE POLICY "see own conversations" ON public.conversations FOR SELECT TO authenticated
  USING ((auth.uid() = user_a OR auth.uid() = user_b) AND (public.can_use_community() OR public.is_coach(auth.uid())));
DROP POLICY IF EXISTS "read messages" ON public.direct_messages;
CREATE POLICY "read messages" ON public.direct_messages FOR SELECT TO authenticated
  USING (public.conv_other(conversation_id) IS NOT NULL AND (public.can_use_community() OR public.is_coach(auth.uid())));

DROP TABLE IF EXISTS public.goal_checks;
DROP TABLE IF EXISTS public.goals;
DROP FUNCTION IF EXISTS public.limit_goals();
