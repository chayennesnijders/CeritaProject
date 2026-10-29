ALTER TABLE public.conversations ADD COLUMN requested_by uuid;
UPDATE public.conversations SET requested_by = user_a;
ALTER TABLE public.conversations ALTER COLUMN requested_by SET NOT NULL;