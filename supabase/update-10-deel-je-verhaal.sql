-- Update na update-9: 'Deel jouw verhaal' zoals op de website (naam, e-mail, toestemming).
-- Plak dit in Supabase → SQL Editor → New query → Run. Per ongeluk twee keer gedaan? Geen probleem.

-- ===== 0059_story_submission_details =====
-- "Deel jouw verhaal" asks the same as the website: a name to show (optional), an e-mail address
-- for contact (optional) and whether CeritaProject may publish the story.
ALTER TABLE public.story_submissions ADD COLUMN IF NOT EXISTS pen_name text CHECK (char_length(pen_name) <= 80);
ALTER TABLE public.story_submissions ADD COLUMN IF NOT EXISTS contact_email text CHECK (char_length(contact_email) <= 200);
ALTER TABLE public.story_submissions ADD COLUMN IF NOT EXISTS may_publish boolean NOT NULL DEFAULT true;
