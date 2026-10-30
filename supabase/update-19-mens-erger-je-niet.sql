-- Update na update-18: Mens erger je niet als spelletje in de chats.
-- Plak dit in Supabase → SQL Editor → New query → Run. Per ongeluk twee keer gedaan? Geen probleem.

-- ===== 0068_chat_game_ludo =====
-- Mens erger je niet as a chat game.
ALTER TABLE public.chat_games DROP CONSTRAINT IF EXISTS chat_games_game_check;
ALTER TABLE public.chat_games ADD CONSTRAINT chat_games_game_check
  CHECK (game IN ('pool', 'darten', 'vieropeenrij', 'boterkaaseieren', 'mensergerjeniet'));
