CREATE OR REPLACE FUNCTION public.profiles_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE yrs int;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.birthdate IS DISTINCT FROM OLD.birthdate
     AND OLD.birthdate IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN
    NEW.birthdate := OLD.birthdate;
  END IF;
  IF NEW.birthdate IS NOT NULL THEN
    yrs := date_part('year', age(NEW.birthdate));
    NEW.age_group := CASE WHEN yrs <= 15 THEN 'junior'::public.age_group
                          WHEN yrs <= 25 THEN 'senior'::public.age_group
                          ELSE 'adult'::public.age_group END;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.age_group := OLD.age_group;
  END IF;
  RETURN NEW;
END $$;

-- Community: 12-15, 16-25 en 26-27 apart; vanaf 28 geen community meer (rest van de app wel).
CREATE OR REPLACE FUNCTION public.can_use_community()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $function$
  SELECT public.has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.birthdate IS NOT NULL
      AND date_part('year', age(p.birthdate)) BETWEEN 12 AND 27)
$function$;

UPDATE public.profiles SET age_group = CASE
  WHEN date_part('year', age(birthdate)) <= 15 THEN 'junior'::public.age_group
  WHEN date_part('year', age(birthdate)) <= 25 THEN 'senior'::public.age_group
  ELSE 'adult'::public.age_group END
WHERE birthdate IS NOT NULL;

INSERT INTO public.groups (name, description, emoji, age_group) VALUES
 ('Werk & studie', 'Over je carrière, afstuderen en de stap daarna', '🎓', 'adult'),
 ('Op jezelf wonen', 'Huren, budgetten en volwassen worden', '🏠', 'adult');