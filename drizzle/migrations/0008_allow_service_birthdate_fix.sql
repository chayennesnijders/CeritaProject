CREATE OR REPLACE FUNCTION public.profiles_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE yrs int;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.birthdate IS DISTINCT FROM OLD.birthdate
     AND OLD.birthdate IS NOT NULL AND auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(),'admin') THEN
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
END $function$;