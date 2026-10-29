-- Minigames next to the pet (they replace the little house). Each finished game is logged;
-- the first 3 games per day give the pet 5 XP each. Scores only count for "your best score".
CREATE TABLE IF NOT EXISTS public.pet_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game text NOT NULL CHECK (game IN ('vangen', 'memory', 'ballonnen')),
  score integer NOT NULL CHECK (score BETWEEN 0 AND 1000),
  play_date date NOT NULL DEFAULT current_date,
  xp integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pet_games_user_day ON public.pet_games (user_id, play_date);
GRANT SELECT ON public.pet_games TO authenticated;
GRANT ALL ON public.pet_games TO service_role;
ALTER TABLE public.pet_games ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own games read" ON public.pet_games;
CREATE POLICY "own games read" ON public.pet_games FOR SELECT TO authenticated USING (user_id = auth.uid());
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.finish_pet_game(_game text, _score integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); rewarded int; reward int := 0;
BEGIN
  IF uid IS NULL OR NOT EXISTS (SELECT 1 FROM public.pets WHERE user_id = uid) THEN RAISE EXCEPTION 'Geen diertje'; END IF;
  -- one row lock per member so two games finishing at once can't both get the 3rd reward
  PERFORM 1 FROM public.pets WHERE user_id = uid FOR UPDATE;
  SELECT count(*) INTO rewarded FROM public.pet_games WHERE user_id = uid AND play_date = current_date AND xp > 0;
  IF rewarded < 3 THEN reward := 5; END IF;
  INSERT INTO public.pet_games (user_id, game, score, xp) VALUES (uid, _game, least(greatest(_score, 0), 1000), reward);
  IF reward > 0 THEN UPDATE public.pets SET xp = xp + reward WHERE user_id = uid; END IF;
  RETURN reward;
END $$;
REVOKE ALL ON FUNCTION public.finish_pet_game(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finish_pet_game(text, integer) TO authenticated;
--> statement-breakpoint
-- Fix: pets_guard was SECURITY DEFINER, so inside it current_user was the owner and never
-- 'authenticated'; members could set their own XP. As SECURITY INVOKER it sees the real role,
-- while XP from care, to-do's and games (all SECURITY DEFINER) still gets through.
ALTER FUNCTION public.pets_guard() SECURITY INVOKER;
