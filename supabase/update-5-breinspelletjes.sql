-- Update na update-4: de nieuwe brein- en gevoelensspelletjes.
-- Plak dit in Supabase → SQL Editor → New query → Run. Per ongeluk twee keer gedaan? Geen probleem.

-- ===== 0054_brain_games =====
-- The minigames are now about your brain and feelings (one new game per level).
-- Old game names stay allowed so earlier scores remain valid.
ALTER TABLE public.pet_games DROP CONSTRAINT IF EXISTS pet_games_game_check;
ALTER TABLE public.pet_games ADD CONSTRAINT pet_games_game_check
  CHECK (game IN ('ademen', 'memory', 'kleuren', 'gevoelens', 'lichtjes', 'gedachten', 'zoeken', 'vangen', 'ballonnen'));
COMMIT;
