CREATE TABLE public.pet_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  todo_date date NOT NULL DEFAULT current_date,
  done boolean NOT NULL DEFAULT false,
  rewarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pet_todos TO authenticated;
GRANT ALL ON public.pet_todos TO service_role;
ALTER TABLE public.pet_todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own todos" ON public.pet_todos FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.pet_todo_xp() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN NEW.rewarded := false; NEW.done := false; RETURN NEW; END IF;
  NEW.rewarded := OLD.rewarded;
  IF NEW.done AND NOT OLD.rewarded THEN
    NEW.rewarded := true;
    UPDATE public.pets SET xp = xp + 5 WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER pet_todo_xp BEFORE INSERT OR UPDATE ON public.pet_todos FOR EACH ROW EXECUTE FUNCTION public.pet_todo_xp();