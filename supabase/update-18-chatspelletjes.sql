-- Update na update-17: spelletjes in groeps- en privéchats (pool, darten, vier op een rij, boter-kaas-en-eieren).
-- Plak dit in Supabase → SQL Editor → New query → Run. Per ongeluk twee keer gedaan? Geen probleem.

-- ===== 0067_chat_games =====
-- Mini games in group and private chats (like iMessage games): pool, darts, connect four, tic-tac-toe.
-- A game is started from a chat and shows up there as a message with a game card. Two players take turns;
-- the app computes the rules, the database only lets the player whose turn it is make a move.
CREATE TABLE IF NOT EXISTS public.chat_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game text NOT NULL CHECK (game IN ('pool', 'darten', 'vieropeenrij', 'boterkaaseieren')),
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  players uuid[] NOT NULL CHECK (cardinality(players) BETWEEN 1 AND 2),
  turn uuid,
  moves integer NOT NULL DEFAULT 0,
  state jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (pg_column_size(state) <= 20000),
  status text NOT NULL DEFAULT 'wacht' CHECK (status IN ('wacht', 'bezig', 'klaar')),
  winner uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((group_id IS NULL) <> (conversation_id IS NULL))
);
CREATE INDEX IF NOT EXISTS chat_games_group_idx ON public.chat_games (group_id);
CREATE INDEX IF NOT EXISTS chat_games_conversation_idx ON public.chat_games (conversation_id);
ALTER TABLE public.chat_games ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.chat_games TO authenticated;
GRANT ALL ON public.chat_games TO service_role;

-- Who may see a game: everyone who can read that chat.
DROP POLICY IF EXISTS "see chat games" ON public.chat_games;
CREATE POLICY "see chat games" ON public.chat_games FOR SELECT TO authenticated USING (
  (group_id IS NOT NULL AND public.can_access_group(group_id))
  OR (conversation_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() IN (c.user_a, c.user_b)))
  OR public.has_role(auth.uid(), 'admin')
);

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS game_id uuid REFERENCES public.chat_games(id) ON DELETE SET NULL;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS game_id uuid REFERENCES public.chat_games(id) ON DELETE SET NULL;

-- Can the current user play along in this chat right now?
CREATE OR REPLACE FUNCTION public.can_play_in(_group uuid, _conv uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN _group IS NOT NULL THEN public.is_member(_group) AND public.can_access_group(_group) AND NOT public.is_timed_out(auth.uid())
    ELSE EXISTS (SELECT 1 FROM public.conversations c
      WHERE c.id = _conv AND auth.uid() IN (c.user_a, c.user_b) AND c.status = 'accepted'
        AND public.can_message(public.conv_other(c.id)))
  END
$$;

-- Starts a game and posts it in the chat in one go. In a private chat both people play straight away;
-- in a group the first member who taps "Doe mee" becomes the opponent.
CREATE OR REPLACE FUNCTION public.start_chat_game(_game text, _group uuid, _conv uuid, _state jsonb, _body text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  g public.chat_games;
  msg uuid;
BEGIN
  IF me IS NULL OR (_group IS NULL) = (_conv IS NULL) OR NOT public.can_play_in(_group, _conv) THEN
    RAISE EXCEPTION 'Je kunt in deze chat geen spelletje starten.';
  END IF;
  IF _group IS NOT NULL THEN
    INSERT INTO public.chat_games (game, group_id, created_by, players, state)
    VALUES (_game, _group, me, ARRAY[me], coalesce(_state, '{}'::jsonb)) RETURNING * INTO g;
    INSERT INTO public.posts (group_id, author_id, body, game_id)
    VALUES (_group, me, left(_body, 2000), g.id) RETURNING id INTO msg;
  ELSE
    INSERT INTO public.chat_games (game, conversation_id, created_by, players, turn, status, state)
    VALUES (_game, _conv, me, ARRAY[me, public.conv_other(_conv)], me, 'bezig', coalesce(_state, '{}'::jsonb)) RETURNING * INTO g;
    INSERT INTO public.direct_messages (conversation_id, sender_id, body, game_id)
    VALUES (_conv, me, left(_body, 2000), g.id) RETURNING id INTO msg;
  END IF;
  RETURN jsonb_build_object('game_id', g.id, 'message_id', msg);
END $$;

-- Joins an open group game as the second player; whoever started it goes first.
CREATE OR REPLACE FUNCTION public.join_chat_game(_game uuid)
RETURNS public.chat_games LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  g public.chat_games;
BEGIN
  SELECT * INTO g FROM public.chat_games WHERE id = _game FOR UPDATE;
  IF g.id IS NULL OR g.status <> 'wacht' OR me = ANY (g.players) OR NOT public.can_play_in(g.group_id, g.conversation_id) THEN
    RAISE EXCEPTION 'Meedoen lukt niet (meer): misschien was iemand je net voor.';
  END IF;
  UPDATE public.chat_games SET players = players || me, turn = created_by, status = 'bezig', updated_at = now()
  WHERE id = _game RETURNING * INTO g;
  RETURN g;
END $$;

-- One move. `_moves` is the number of moves the player saw, so a double tap or an old screen cannot
-- play twice. `_again`: the same player goes again (pool). `_winner`: 0 or 1 (index in players) or null for a draw.
CREATE OR REPLACE FUNCTION public.chat_game_move(_game uuid, _moves integer, _state jsonb, _again boolean, _finished boolean, _winner integer)
RETURNS public.chat_games LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  g public.chat_games;
BEGIN
  SELECT * INTO g FROM public.chat_games WHERE id = _game FOR UPDATE;
  IF g.id IS NULL OR g.status <> 'bezig' OR g.turn IS DISTINCT FROM me THEN
    RAISE EXCEPTION 'Je bent nu niet aan de beurt.';
  END IF;
  IF g.moves <> _moves THEN
    RAISE EXCEPTION 'Het spel is net veranderd. Kijk opnieuw.';
  END IF;
  IF NOT public.can_play_in(g.group_id, g.conversation_id) THEN
    RAISE EXCEPTION 'Je kunt in deze chat nu niet spelen.';
  END IF;
  UPDATE public.chat_games SET
    state = _state,
    moves = moves + 1,
    status = CASE WHEN _finished THEN 'klaar' ELSE 'bezig' END,
    winner = CASE WHEN _finished AND _winner IN (0, 1) THEN players[_winner + 1] END,
    turn = CASE WHEN _finished THEN NULL WHEN _again THEN me
                ELSE (SELECT p FROM unnest(players) p WHERE p <> me LIMIT 1) END,
    updated_at = now()
  WHERE id = _game RETURNING * INTO g;
  RETURN g;
END $$;

-- Stop: the starter can cancel an open game; a player can give up (the other one wins).
CREATE OR REPLACE FUNCTION public.stop_chat_game(_game uuid)
RETURNS public.chat_games LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  g public.chat_games;
BEGIN
  SELECT * INTO g FROM public.chat_games WHERE id = _game FOR UPDATE;
  IF g.id IS NULL OR g.status = 'klaar' OR NOT (me = ANY (g.players)) THEN
    RAISE EXCEPTION 'Dit spel kun je niet stoppen.';
  END IF;
  UPDATE public.chat_games SET status = 'klaar', turn = NULL,
    winner = (SELECT p FROM unnest(players) p WHERE p <> me LIMIT 1), updated_at = now()
  WHERE id = _game RETURNING * INTO g;
  RETURN g;
END $$;

REVOKE ALL ON FUNCTION public.can_play_in(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.start_chat_game(text, uuid, uuid, jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_chat_game(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.chat_game_move(uuid, integer, jsonb, boolean, boolean, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.stop_chat_game(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_play_in(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_chat_game(text, uuid, uuid, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_chat_game(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_game_move(uuid, integer, jsonb, boolean, boolean, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.stop_chat_game(uuid) TO authenticated;

-- Live: a move shows up straight away for the other player.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_games') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_games;
  END IF;
END $$;
