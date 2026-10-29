CREATE TABLE public.companions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  species text NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 30),
  outfit text NOT NULL DEFAULT 'geen',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.companions TO authenticated;
GRANT ALL ON public.companions TO service_role;
ALTER TABLE public.companions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own companions read" ON public.companions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own companions add" ON public.companions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own companions edit" ON public.companions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Extra pet slot every 2 levels: level 3 -> 1 extra, level 5 -> 2, ...
CREATE OR REPLACE FUNCTION public.companions_limit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE lvl int; have int;
BEGIN
  SELECT floor(xp / 50) + 1 INTO lvl FROM public.pets WHERE user_id = NEW.user_id;
  SELECT count(*) INTO have FROM public.companions WHERE user_id = NEW.user_id;
  IF lvl IS NULL OR have >= floor((lvl - 1) / 2) THEN
    RAISE EXCEPTION 'Nog geen nieuw diertje vrijgespeeld';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER companions_limit BEFORE INSERT ON public.companions FOR EACH ROW EXECUTE FUNCTION public.companions_limit();

CREATE TABLE public.pet_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pet_ref text NOT NULL DEFAULT 'main',
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 40),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pet_lists TO authenticated;
GRANT ALL ON public.pet_lists TO service_role;
ALTER TABLE public.pet_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lists" ON public.pet_lists FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.pet_todos ADD COLUMN list_id uuid REFERENCES public.pet_lists(id) ON DELETE CASCADE;