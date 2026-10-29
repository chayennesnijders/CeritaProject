CREATE TABLE public.pets (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 30),
  species text NOT NULL DEFAULT 'kat',
  xp integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.pets TO authenticated;
GRANT ALL ON public.pets TO service_role;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pet read" ON public.pets FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own pet create" ON public.pets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND xp = 0);
CREATE POLICY "own pet rename" ON public.pets FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.pet_care (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  care_date date NOT NULL DEFAULT current_date,
  action text NOT NULL CHECK (action IN ('eten','spelen','knuffel')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, care_date, action)
);
GRANT SELECT, INSERT ON public.pet_care TO authenticated;
GRANT ALL ON public.pet_care TO service_role;
ALTER TABLE public.pet_care ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own care read" ON public.pet_care FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own care add" ON public.pet_care FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND care_date = current_date);

CREATE OR REPLACE FUNCTION public.pet_care_xp() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.pets SET xp = xp + 10 WHERE user_id = NEW.user_id;
  RETURN NEW;
END $$;
CREATE TRIGGER pet_care_xp AFTER INSERT ON public.pet_care FOR EACH ROW EXECUTE FUNCTION public.pet_care_xp();

CREATE OR REPLACE FUNCTION public.pets_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_user = 'authenticated' AND NEW.xp <> OLD.xp AND pg_trigger_depth() = 1 THEN
    NEW.xp := OLD.xp;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER pets_guard BEFORE UPDATE ON public.pets FOR EACH ROW EXECUTE FUNCTION public.pets_guard();