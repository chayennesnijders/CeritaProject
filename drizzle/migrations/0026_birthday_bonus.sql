CREATE TABLE public.birthday_claims (
  user_id uuid not null references public.profiles(id) on delete cascade,
  claim_year integer not null,
  created_at timestamptz not null default now(),
  primary key (user_id, claim_year)
);
GRANT SELECT, INSERT ON public.birthday_claims TO authenticated;
GRANT ALL ON public.birthday_claims TO service_role;
ALTER TABLE public.birthday_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own birthday claims" ON public.birthday_claims
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Verjaardagscadeau: +25 XP, een keer per jaar, alleen op de verjaardag zelf.
CREATE OR REPLACE FUNCTION public.claim_birthday_bonus()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bd date;
  yr integer := extract(year from now())::int;
BEGIN
  SELECT birthdate INTO bd FROM public.profiles WHERE id = auth.uid();
  IF bd IS NULL THEN RETURN 0; END IF;
  IF extract(month from bd) <> extract(month from now())
     OR extract(day from bd) <> extract(day from now()) THEN
    RETURN 0;
  END IF;
  INSERT INTO public.birthday_claims (user_id, claim_year)
  VALUES (auth.uid(), yr)
  ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN 0; END IF;
  UPDATE public.pets SET xp = xp + 25 WHERE user_id = auth.uid();
  RETURN 25;
END;
$$;