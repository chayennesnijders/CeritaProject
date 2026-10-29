-- "Deel jouw verhaal" asks the same as the website: a name to show (optional), an e-mail address
-- for contact (optional) and whether CeritaProject may publish the story.
ALTER TABLE public.story_submissions ADD COLUMN IF NOT EXISTS pen_name text CHECK (char_length(pen_name) <= 80);
ALTER TABLE public.story_submissions ADD COLUMN IF NOT EXISTS contact_email text CHECK (char_length(contact_email) <= 200);
ALTER TABLE public.story_submissions ADD COLUMN IF NOT EXISTS may_publish boolean NOT NULL DEFAULT true;
