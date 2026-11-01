-- Update na update-32: 'Wat heb je nodig?' bij berichten in groepen en privéchats.
-- Plak dit in Supabase → SQL Editor → New query → Run. Per ongeluk twee keer gedaan? Geen probleem.
BEGIN;

-- ===== 0082_message_needs =====
-- "Wat heb je nodig?": a group post or private message can say what the writer would like from
-- others (just listening, advice, recognition, support or distraction). Optional; empty = nothing chosen.
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS need text;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS need text;
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_need_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_need_check
  CHECK (need IS NULL OR need IN ('luisteren', 'advies', 'herkenning', 'steun', 'afleiding'));
ALTER TABLE public.direct_messages DROP CONSTRAINT IF EXISTS direct_messages_need_check;
ALTER TABLE public.direct_messages ADD CONSTRAINT direct_messages_need_check
  CHECK (need IS NULL OR need IN ('luisteren', 'advies', 'herkenning', 'steun', 'afleiding'));

COMMIT;
