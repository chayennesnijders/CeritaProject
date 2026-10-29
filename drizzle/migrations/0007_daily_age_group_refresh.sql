CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE OR REPLACE FUNCTION public.refresh_age_groups()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles SET age_group = CASE
    WHEN date_part('year', age(birthdate)) <= 15 THEN 'junior'::public.age_group
    WHEN date_part('year', age(birthdate)) <= 25 THEN 'senior'::public.age_group
    ELSE 'adult'::public.age_group END
  WHERE birthdate IS NOT NULL AND age_group IS DISTINCT FROM CASE
    WHEN date_part('year', age(birthdate)) <= 15 THEN 'junior'::public.age_group
    WHEN date_part('year', age(birthdate)) <= 25 THEN 'senior'::public.age_group
    ELSE 'adult'::public.age_group END;
$$;
REVOKE EXECUTE ON FUNCTION public.refresh_age_groups() FROM PUBLIC, anon, authenticated;
SELECT cron.schedule('refresh-age-groups', '5 0 * * *', 'SELECT public.refresh_age_groups()');