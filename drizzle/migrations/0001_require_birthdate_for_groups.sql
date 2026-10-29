CREATE OR REPLACE FUNCTION public.my_age_group()
RETURNS public.age_group LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT age_group FROM public.profiles WHERE id = auth.uid() AND birthdate IS NOT NULL
$$;