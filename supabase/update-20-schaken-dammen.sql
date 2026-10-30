-- Update na update-19: schaken en dammen als spelletje in de chats.
-- Plak dit in Supabase → SQL Editor → New query → Run. Per ongeluk twee keer gedaan? Geen probleem.

-- ===== 0069_chat_game_chess_draughts =====
-- Chess and draughts as chat games.
ALTER TABLE public.chat_games DROP CONSTRAINT IF EXISTS chat_games_game_check;
ALTER TABLE public.chat_games ADD CONSTRAINT chat_games_game_check
  CHECK (game IN ('pool', 'darten', 'vieropeenrij', 'boterkaaseieren', 'mensergerjeniet', 'schaken', 'dammen'));
