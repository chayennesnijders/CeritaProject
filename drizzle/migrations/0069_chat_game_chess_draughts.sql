-- Chess and draughts as chat games.
ALTER TABLE public.chat_games DROP CONSTRAINT IF EXISTS chat_games_game_check;
ALTER TABLE public.chat_games ADD CONSTRAINT chat_games_game_check
  CHECK (game IN ('pool', 'darten', 'vieropeenrij', 'boterkaaseieren', 'mensergerjeniet', 'schaken', 'dammen'));
