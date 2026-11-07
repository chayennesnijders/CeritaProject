BEGIN;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_reminder boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reminder_hour smallint NOT NULL DEFAULT 19;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reminded_on date;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_reminder_hour_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_reminder_hour_check CHECK (reminder_hour BETWEEN 7 AND 22);
CREATE INDEX IF NOT EXISTS profiles_daily_reminder_idx ON public.profiles (reminder_hour) WHERE daily_reminder;

COMMIT;
